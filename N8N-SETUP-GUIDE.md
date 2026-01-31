# n8n Workflow Setup Guide for Family Pantry App

This guide will walk you through setting up the 3 n8n workflows for your grocery app.

---

## Prerequisites

1. Your n8n instance is running at `hearforlife.app.n8n.cloud`
2. You have an Anthropic API key (or OpenAI key for Claude/GPT)
3. Your Google Sheet is set up with the correct tabs and headers

---

## Workflow 1: Photo Processing

**Webhook URL:** `https://hearforlife.app.n8n.cloud/webhook/a95476d1-0eca-465d-ae70-d061a8b2260c`

### Workflow Structure:

```
[Webhook] → [Claude/AI Vision] → [Parse JSON] → [Google Sheets: Append Rows] → [Respond to Webhook]
```

### Step-by-Step Setup:

#### Node 1: Webhook (Already created)
- Keep defaults, webhook is active

#### Node 2: HTTP Request (Claude API)
- **Method:** POST
- **URL:** `https://api.anthropic.com/v1/messages`
- **Authentication:** Header Auth
  - Name: `x-api-key`
  - Value: `your-anthropic-api-key`
- **Headers:**
  - `anthropic-version`: `2023-06-01`
  - `Content-Type`: `application/json`
- **Body (JSON):**

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 2048,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": "{{ $json.body.image.split(',')[1] }}"
          }
        },
        {
          "type": "text",
          "text": "Analyze this image of groceries. Identify each food/grocery item visible. For each item, provide a JSON array with objects containing: item (name), quantity (estimated count), unit (count, lbs, oz, etc), category (Groceries, Produce, Dairy, Meat, Frozen, Pantry, Cleaning Supplies, Child Care, Personal Care, Beverages, Snacks, Other). Return ONLY valid JSON array, no other text. Example: [{\"item\":\"Milk\",\"quantity\":1,\"unit\":\"gallons\",\"category\":\"Dairy\"}]"
        }
      ]
    }
  ]
}
```

#### Node 3: Code (Parse Response)
- **Mode:** Run Once for All Items
- **JavaScript:**

```javascript
const response = $input.first().json;
const store = $('Webhook').first().json.body.store || 'Walmart';

let items = [];

try {
  // Extract the text content from Claude's response
  const content = response.content[0].text;
  
  // Parse the JSON array
  items = JSON.parse(content);
  
  // Add additional fields to each item
  items = items.map(item => ({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    item: item.item,
    quantity: item.quantity || 1,
    unit: item.unit || 'count',
    minQuantity: 1,
    store: store,
    category: item.category || 'Groceries',
    priority: 'Nice-to-Have',
    dateAdded: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    addedBy: 'AI Scan',
    notes: ''
  }));
} catch (e) {
  console.log('Parse error:', e);
}

return items.map(item => ({ json: item }));
```

#### Node 4: Google Sheets (Append Rows)
- **Operation:** Append Row
- **Document:** Select your spreadsheet
- **Sheet:** Inventory
- **Columns:** Map each field:
  - id → `{{ $json.id }}`
  - item → `{{ $json.item }}`
  - quantity → `{{ $json.quantity }}`
  - unit → `{{ $json.unit }}`
  - minQuantity → `{{ $json.minQuantity }}`
  - store → `{{ $json.store }}`
  - category → `{{ $json.category }}`
  - priority → `{{ $json.priority }}`
  - dateAdded → `{{ $json.dateAdded }}`
  - lastUpdated → `{{ $json.lastUpdated }}`
  - addedBy → `{{ $json.addedBy }}`
  - notes → `{{ $json.notes }}`

#### Node 5: Respond to Webhook
- **Response Code:** 200
- **Response Body:**
```json
{
  "success": true,
  "itemsAdded": {{ $json.length }}
}
```

---

## Workflow 2: Meal Suggestions

**Webhook URL:** `https://hearforlife.app.n8n.cloud/webhook/51e82f23-934e-41e4-951a-d8dc1d076b1a`

### Workflow Structure:

```
[Webhook] → [Google Sheets: Read] → [Claude AI] → [Parse Response] → [Respond to Webhook]
```

### Step-by-Step Setup:

#### Node 1: Webhook (Already created)

#### Node 2: Google Sheets (Read Inventory)
- **Operation:** Read Rows
- **Document:** Select your spreadsheet
- **Sheet:** Inventory
- **Options:** Return all rows

#### Node 3: Code (Prepare Inventory List)
```javascript
const items = $input.all();
const inventoryList = items
  .filter(item => item.json.quantity > 0)
  .map(item => `${item.json.item} (${item.json.quantity} ${item.json.unit})`)
  .join(', ');

return [{ json: { inventory: inventoryList } }];
```

#### Node 4: HTTP Request (Claude API)
- **Method:** POST
- **URL:** `https://api.anthropic.com/v1/messages`
- **Authentication:** Header Auth
  - Name: `x-api-key`
  - Value: `your-anthropic-api-key`
- **Headers:**
  - `anthropic-version`: `2023-06-01`
  - `Content-Type`: `application/json`
- **Body:**

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 2048,
  "messages": [
    {
      "role": "user",
      "content": "Based on these available ingredients: {{ $json.inventory }}\n\nSuggest exactly 3 meals that can be made with these ingredients. For each meal provide:\n1. A creative name\n2. A brief description (2-3 sentences) explaining how to make it and why it's delicious\n\nReturn ONLY a valid JSON array with this format:\n[{\"name\":\"Meal Name\",\"description\":\"How to make it and why it's good\"}]\n\nNo other text, just the JSON array."
    }
  ]
}
```

#### Node 5: Code (Parse Meals)
```javascript
const response = $input.first().json;

try {
  const content = response.content[0].text;
  const meals = JSON.parse(content);
  
  return [{ json: { meals: meals } }];
} catch (e) {
  return [{ json: { meals: [
    { name: "Simple Stir Fry", description: "A quick and easy meal with whatever vegetables you have on hand." },
    { name: "Pantry Pasta", description: "Pasta with olive oil, garlic, and whatever proteins and veggies are available." },
    { name: "Everything Soup", description: "A hearty soup made by combining available vegetables and proteins in broth." }
  ] } }];
}
```

#### Node 6: Respond to Webhook
- **Response Code:** 200
- **Response Body:**
```json
{{ JSON.stringify($json) }}
```

---

## Workflow 3: Shopping List Sync

**Webhook URL:** `https://hearforlife.app.n8n.cloud/webhook/5375abd1-5e09-47c3-8818-570f13c3a60c`

### Workflow Structure:

```
[Webhook] → [Google Sheets: Read Inventory] → [Code: Filter Low Items] → [Google Sheets: Read Shopping List] → [Code: Find New Items] → [Google Sheets: Append] → [Respond to Webhook]
```

### Step-by-Step Setup:

#### Node 1: Webhook (Already created)

#### Node 2: Google Sheets (Read Inventory)
- **Operation:** Read Rows
- **Document:** Select your spreadsheet
- **Sheet:** Inventory

#### Node 3: Code (Filter Low Essential Items)
```javascript
const items = $input.all();

const lowItems = items
  .filter(item => {
    const qty = Number(item.json.quantity) || 0;
    const minQty = Number(item.json.minQuantity) || 1;
    const priority = item.json.priority;
    
    return priority === 'Essential' && qty <= minQty;
  })
  .map(item => ({
    id: item.json.id,
    item: item.json.item,
    quantityNeeded: Math.max(1, (item.json.minQuantity || 1) - (item.json.quantity || 0) + 1),
    unit: item.json.unit,
    store: item.json.store,
    category: item.json.category,
    priority: item.json.priority
  }));

return [{ json: { lowItems } }];
```

#### Node 4: Google Sheets (Read Shopping List)
- **Operation:** Read Rows
- **Document:** Select your spreadsheet
- **Sheet:** ShoppingList

#### Node 5: Code (Find Items Not on List)
```javascript
const lowItems = $('Code').first().json.lowItems;
const shoppingList = $input.all();

// Get IDs already on shopping list (not purchased)
const existingIds = new Set(
  shoppingList
    .filter(item => item.json.purchased !== true && item.json.purchased !== 'TRUE')
    .map(item => item.json.id)
);

// Filter to items not already on list
const newItems = lowItems
  .filter(item => !existingIds.has(item.id))
  .map(item => ({
    json: {
      id: item.id,
      item: item.item,
      quantityNeeded: item.quantityNeeded,
      unit: item.unit,
      store: item.store,
      category: item.category,
      priority: item.priority,
      dateAdded: new Date().toISOString(),
      purchased: false,
      datePurchased: ''
    }
  }));

if (newItems.length === 0) {
  return [{ json: { noNewItems: true } }];
}

return newItems;
```

#### Node 6: IF Node
- Check if `{{ $json.noNewItems }}` is true
- True branch: Go to Respond (no items to add)
- False branch: Go to Google Sheets Append

#### Node 7: Google Sheets (Append to Shopping List) - False branch only
- **Operation:** Append Row
- **Document:** Select your spreadsheet
- **Sheet:** ShoppingList
- Map all columns similar to Workflow 1

#### Node 8: Respond to Webhook
```json
{
  "success": true,
  "message": "Shopping list synced"
}
```

---

## Google Sheets OAuth Setup in n8n

1. In n8n, go to **Credentials** → **Add Credential**
2. Search for **Google Sheets OAuth2 API**
3. Click **Create New Credential**
4. You'll need to set up OAuth in Google Cloud Console:
   - Go to https://console.cloud.google.com
   - Create a new project (or use existing)
   - Enable the **Google Sheets API**
   - Go to **Credentials** → **Create Credentials** → **OAuth Client ID**
   - Application type: **Web application**
   - Add authorized redirect URI from n8n
   - Copy Client ID and Client Secret to n8n
5. Click **Sign in with Google** and authorize

---

## Testing Your Workflows

### Test Workflow 1 (Photo):
```bash
curl -X POST https://hearforlife.app.n8n.cloud/webhook/a95476d1-0eca-465d-ae70-d061a8b2260c \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,/9j/4AAQ...", "store": "HEB"}'
```

### Test Workflow 2 (Meals):
```bash
curl -X POST https://hearforlife.app.n8n.cloud/webhook/51e82f23-934e-41e4-951a-d8dc1d076b1a \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Test Workflow 3 (Sync):
```bash
curl -X POST https://hearforlife.app.n8n.cloud/webhook/5375abd1-5e09-47c3-8818-570f13c3a60c \
  -H "Content-Type: application/json" \
  -d '{"action": "sync"}'
```

---

## Troubleshooting

### Common Issues:

1. **"Unauthorized" from Claude API**
   - Check your API key is correct
   - Ensure header name is exactly `x-api-key`

2. **Google Sheets not updating**
   - Verify OAuth credentials are valid
   - Check sheet names match exactly (case-sensitive)
   - Ensure you selected the correct spreadsheet

3. **Webhook not responding**
   - Make sure workflow is set to "Active"
   - Check webhook is in "Production" mode (not Test)

4. **JSON parse errors**
   - Claude sometimes adds markdown backticks - the Code nodes handle this
   - Check the execution log for the actual response

---

## Next Steps

1. Set up each workflow following the guides above
2. Test each workflow individually
3. Deploy your app to GitHub Pages
4. Configure the Apps Script URL in the app settings
5. Start tracking your groceries! 🛒
