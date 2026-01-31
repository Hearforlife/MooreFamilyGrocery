# Family Pantry 🛒

A mobile-first Progressive Web App for tracking family groceries, creating shopping lists, and getting AI-powered meal suggestions.

![Family Pantry App](https://img.shields.io/badge/PWA-Ready-brightgreen) ![Mobile First](https://img.shields.io/badge/Mobile-First-blue)

## Features

- **📦 Inventory Tracking** - Track all your groceries with quantities, stores, and categories
- **📝 Smart Shopping Lists** - Automatically adds low essential items to your shopping list
- **📸 AI Photo Scanning** - Take a photo of groceries and AI adds them to inventory
- **🍳 Meal Suggestions** - Get 3 meal ideas based on your current inventory
- **🌙 Dark Mode** - Automatic or manual dark mode support
- **📱 PWA** - Install on your phone's home screen
- **🏪 Multi-Store** - Track items from Walmart, HEB, Sam's Club, and Target

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no build required)
- **Backend:** Google Apps Script
- **Database:** Google Sheets
- **AI Workflows:** n8n + Claude API
- **Hosting:** GitHub Pages

## Quick Start

### 1. Set Up Google Sheet

Open your Google Sheet and create 3 tabs with these headers:

**Tab: Inventory**
```
id | item | quantity | unit | minQuantity | store | category | priority | dateAdded | lastUpdated | addedBy | notes
```

**Tab: ShoppingList**
```
id | item | quantityNeeded | unit | store | category | priority | dateAdded | purchased | datePurchased
```

**Tab: MealSuggestions**
```
timestamp | meal1 | meal2 | meal3 | ingredientsAvailable
```

### 2. Deploy Google Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Copy the contents of `google-apps-script.js` into the editor
3. Click **Deploy → New deployment**
4. Select **Web app**
5. Set **Execute as:** Me
6. Set **Who has access:** Anyone
7. Click **Deploy** and authorize
8. Copy the Web App URL

### 3. Set Up n8n Workflows

See [N8N-SETUP-GUIDE.md](N8N-SETUP-GUIDE.md) for detailed instructions on setting up the 3 AI workflows:

1. **Photo Processing** - Analyzes photos and adds items
2. **Meal Suggestions** - Generates meal ideas from inventory
3. **Shopping List Sync** - Auto-adds low essential items

### 4. Deploy to GitHub Pages

1. Fork this repository
2. Go to **Settings → Pages**
3. Select **Source:** Deploy from a branch
4. Select **Branch:** main, **Folder:** / (root)
5. Click **Save**
6. Your app will be live at `https://yourusername.github.io/family-pantry`

### 5. Configure the App

1. Open your deployed app
2. Click the **⚙️ Settings** button
3. Paste your **Google Apps Script Web App URL**
4. Click **Save Settings**

## Usage

### Adding Items Manually
1. Tap the **+** button
2. Fill in item details
3. Set **Priority** to "Essential" for auto shopping list
4. Tap **Add to Inventory**

### Scanning Groceries
1. Go to the **Scan** tab
2. Tap **Take Photo**
3. Select your store
4. Tap **Process with AI**
5. Items are automatically added to inventory

### Shopping Lists
- Items marked **Essential** with quantity ≤ minimum are auto-added
- Tap **Refresh** to sync the list
- Check off items as you shop
- Filter by store when shopping

### Meal Ideas
1. Go to the **Meals** tab
2. Tap **Get Ideas**
3. AI analyzes your inventory and suggests 3 meals

## File Structure

```
family-pantry/
├── index.html          # Main app (HTML/CSS/JS)
├── manifest.json       # PWA manifest
├── sw.js              # Service worker for offline
├── icon-192.png       # App icon (small)
├── icon-512.png       # App icon (large)
├── google-apps-script.js  # Backend code for Google Sheets
├── N8N-SETUP-GUIDE.md    # n8n workflow instructions
└── README.md          # This file
```

## Categories

- Groceries
- Produce
- Dairy
- Meat
- Frozen
- Pantry
- Cleaning Supplies
- Child Care
- Personal Care
- Beverages
- Snacks
- Other

## Priority Levels

- **Essential** - Auto-added to shopping list when low
- **Nice-to-Have** - Regular items
- **Occasional** - Items you don't always need

## Supported Stores

- Walmart
- HEB
- Sam's Club
- Target

## Contributing

Feel free to open issues or submit pull requests!

## License

MIT License - feel free to use for your family!

---

Made with ❤️ for busy families
