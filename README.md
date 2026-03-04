# Ralphs Grocery Runner

A lightweight Chrome extension that helps you quickly add a grocery list
to your cart on **Ralphs.com** by stepping through items one at a time.

Instead of manually searching each item, the extension provides a side
panel that walks you through your grocery list and opens Ralphs search
results automatically.

This tool **does not automatically add items to your cart**. It simply
accelerates the process of searching and navigating items.

------------------------------------------------------------------------

# Features

• Upload a reusable `.txt` grocery list\
• One-by-one workflow for faster shopping\
• Automatically opens the next search after you mark an item complete\
• Uses a single reusable "shopping tab" to avoid tab clutter\
• Progress bar and checklist tracking\
• Keyboard shortcuts for fast navigation\
• Clean floating UI panel on Ralphs.com

------------------------------------------------------------------------

# Keyboard Shortcuts

  Key       Action
  --------- ---------------------
  **S**     Search current item
  **D**     Done + Next
  **K**     Skip item
  **J**     Go back
  **Esc**   Close panel

------------------------------------------------------------------------

# Grocery List Format

Upload a `.txt` file with **one search term per line**.

Example:

    cauliflower 1 head
    green cabbage
    limes 2 ct
    cilantro bunch
    garlic head
    black beans 15 oz
    chipotle peppers in adobo
    raw cashews
    chili powder
    corn tortillas
    olive oil
    apple cider vinegar

Each line becomes a Ralphs search query.

------------------------------------------------------------------------

# Installation (Developer Mode)

Because this extension is not in the Chrome Web Store, you must load it
manually.

## 1. Clone the repo

``` bash
git clone https://github.com/YOUR_USERNAME/ralphs-grocery-runner.git
```

or download the ZIP.

------------------------------------------------------------------------

## 2. Open Chrome Extensions

Navigate to:

    chrome://extensions

Enable:

    Developer Mode

------------------------------------------------------------------------

## 3. Load the Extension

Click:

    Load unpacked

Select the project folder:

    ralphs-grocery-runner/

The extension will now appear in your browser.

------------------------------------------------------------------------

# Usage

1.  Visit

```{=html}
<!-- -->
```
    https://www.ralphs.com

2.  Click the extension icon.

3.  Upload your grocery list `.txt` file.

4.  Click:

```{=html}
<!-- -->
```
    Toggle panel on Ralphs

5.  Use the runner workflow:

```{=html}
<!-- -->
```
    Search → Add item to cart → Done + Next

The extension will automatically navigate the search tab to the next
item.

------------------------------------------------------------------------

# Privacy

This extension:

• Runs only on `ralphs.com`\
• Stores grocery lists locally in Chrome storage\
• Does not collect or transmit any personal data

------------------------------------------------------------------------

# Roadmap Ideas

Possible improvements:

• draggable panel\
• Instacart compatibility\
• recipe → grocery list parser\
• smart item normalization\
• multiple saved lists

------------------------------------------------------------------------

# License

MIT License
