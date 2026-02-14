// Minimal OpenCV.js scanning module
// 1) capture frame from video
// 2) find biggest 4-point contour
// 3) warp perspective into a clean rectangle
// Returns an object: { dataUrl, usedWarp }

let stream = null;

export async function startCamera(videoEl) {
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false
  });
  videoEl.srcObject = stream;
  await videoEl.play();
}

export function stopCamera(videoEl) {
  if (videoEl) videoEl.pause();
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
}

function orderPoints(pts) {
  const sum = pts.map(p => p.x + p.y);
  const diff = pts.map(p => p.y - p.x);

  const tl = pts[sum.indexOf(Math.min(...sum))];
  const br = pts[sum.indexOf(Math.max(...sum))];
  const tr = pts[diff.indexOf(Math.min(...diff))];
  const bl = pts[diff.indexOf(Math.max(...diff))];
  return [tl, tr, br, bl];
}

function dist(a,b){
  return Math.hypot(a.x-b.x, a.y-b.y);
}

export function captureAndWarp(videoEl, canvasEl) {
  if (!window.cv) throw new Error("OpenCV not loaded (cv missing).");
  if (videoEl.videoWidth === 0) throw new Error("Video not ready.");

  canvasEl.width = videoEl.videoWidth;
  canvasEl.height = videoEl.videoHeight;
  const ctx = canvasEl.getContext("2d");
  ctx.drawImage(videoEl, 0, 0);

  const src = cv.imread(canvasEl);
  const gray = new cv.Mat();
  const blur = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  cv.GaussianBlur(gray, blur, new cv.Size(5,5), 0);
  cv.Canny(blur, edges, 60, 160);

  cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  let best = null;
  let bestArea = 0;

  for (let i = 0; i < contours.size(); i++) {
    const c = contours.get(i);
    const peri = cv.arcLength(c, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(c, approx, 0.02 * peri, true);

    if (approx.rows === 4) {
      const area = cv.contourArea(approx);
      if (area > bestArea) {
        bestArea = area;
        best?.delete?.();
        best = approx;
      } else {
        approx.delete();
      }
    } else {
      approx.delete();
    }
  }

  if (!best) {
    const raw = canvasEl.toDataURL("image/jpeg", 0.92);
    src.delete(); gray.delete(); blur.delete(); edges.delete(); contours.delete(); hierarchy.delete();
    return { dataUrl: raw, usedWarp: false };
  }

  const pts = [];
  for (let i=0; i<4; i++){
    const x = best.intPtr(i,0)[0];
    const y = best.intPtr(i,0)[1];
    pts.push({x,y});
  }
  const [tl,tr,br,bl] = orderPoints(pts);

  const wA = dist(br, bl);
  const wB = dist(tr, tl);
  const maxW = Math.max(wA, wB);

  const hA = dist(tr, br);
  const hB = dist(tl, bl);
  const maxH = Math.max(hA, hB);

  const srcTri = cv.matFromArray(4,1,cv.CV_32FC2, [tl.x,tl.y, tr.x,tr.y, br.x,br.y, bl.x,bl.y]);
  const dstTri = cv.matFromArray(4,1,cv.CV_32FC2, [0,0, maxW,0, maxW,maxH, 0,maxH]);

  const M = cv.getPerspectiveTransform(srcTri, dstTri);
  const dst = new cv.Mat();
  const dsize = new cv.Size(Math.floor(maxW), Math.floor(maxH));
  cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_REPLICATE);

  canvasEl.width = dst.cols;
  canvasEl.height = dst.rows;
  cv.imshow(canvasEl, dst);

  const dataUrl = canvasEl.toDataURL("image/jpeg", 0.92);

  src.delete(); gray.delete(); blur.delete(); edges.delete();
  contours.delete(); hierarchy.delete();
  best.delete(); srcTri.delete(); dstTri.delete(); M.delete(); dst.delete();

  return { dataUrl, usedWarp: true };
}
