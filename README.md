# Stable Product Catalog

A responsive product catalog built with plain HTML, CSS, and JavaScript. It loads product data from [DummyJSON](https://dummyjson.com) and offers separate admin and customer storefront views. The storefront supports search, category filtering, sorting, product details, and a demo shopping cart. The admin dashboard supports product search, category filtering, sorting, list and grid layouts, product details, and add, edit, and delete actions. Both views share red accents and dark and light themes.

## Run locally

Open `index.html` in a browser, or serve this folder with any static web server. For example, with PHP installed:

```sh
php -S localhost:8000
```

Then visit `http://localhost:8000`.

## Deploy

This is a static site. Import the folder or its GitHub repository into Netlify or Vercel and use the default settings (no build command; publish the project root). Railway can also serve it as a static site.

## Data behavior

DummyJSON simulates product creation, updates, and deletions. The interface reflects those actions during the current session, but DummyJSON does not persist them to its source catalog. A real store that needs durable inventory changes should use a backend and database.

Cart and checkout are demonstrations available in customer view. Checkout does not collect payment details; it updates the displayed stock for the current session only.
