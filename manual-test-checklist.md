# TCGdex Autofill Manual Check

1. Open `add-card.html` in the browser.
2. Enter a known TCGdex card ID such as `swshp-SWSH039` and click `Autofill`.
3. Confirm the form fills `Card Name`, `Series`, `Series Expansion`, `Rarity`, and `Card Number`.
4. Confirm the autofilled values stay selected even if the page is still finishing its initial data load.
5. Try a card ID with letters in the local number, such as a promo or trainer-gallery card, and confirm `Card Number` accepts it without validation errors.
6. Click `Add To Binder` and confirm the success message appears.
7. Open `binders.html` or the nested binder page and confirm the saved card appears.
8. Repeat once with an existing `Image URL` value already present to confirm Autofill does not overwrite a manually entered image URL.