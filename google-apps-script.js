/**
 * Family Pantry - Google Apps Script Backend
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1zX2mr8-r7ktAxvbRbqpIJBoYxLBdgvzoORURx9hGcew/edit
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Click "Deploy" > "New deployment"
 * 5. Select "Web app"
 * 6. Set "Execute as" to "Me"
 * 7. Set "Who has access" to "Anyone"
 * 8. Click "Deploy" and authorize
 * 9. Copy the Web App URL and paste it in the app's Settings
 */

// Sheet names
const INVENTORY_SHEET = 'Inventory';
const SHOPPING_LIST_SHEET = 'ShoppingList';
const MEAL_SUGGESTIONS_SHEET = 'MealSuggestions';

// Get active spreadsheet
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// ==================== HTTP HANDLERS ====================

function doGet(e) {
  const action = e.parameter.action;
  let result;
  
  switch(action) {
    case 'getInventory':
      result = getInventory();
      break;
    case 'getShoppingList':
      result = getShoppingList();
      break;
    case 'getMealSuggestions':
      result = getMealSuggestions();
      break;
    default:
      result = { error: 'Unknown action' };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  let result;
  
  switch(action) {
    case 'addItem':
      result = addItem(data);
      break;
    case 'updateQuantity':
      result = updateQuantity(data.id, data.quantity);
      break;
    case 'deleteItem':
      result = deleteItem(data.id);
      break;
    case 'togglePurchased':
      result = togglePurchased(data.id, data.purchased);
      break;
    case 'addToShoppingList':
      result = addToShoppingList(data);
      break;
    case 'clearPurchased':
      result = clearPurchasedItems();
      break;
    case 'addItems':
      result = addMultipleItems(data.items);
      break;
    case 'syncShoppingList':
      result = syncShoppingList();
      break;
    case 'saveMealSuggestions':
      result = saveMealSuggestions(data.meals);
      break;
    default:
      result = { error: 'Unknown action' };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== INVENTORY FUNCTIONS ====================

function getInventory() {
  const sheet = getSpreadsheet().getSheetByName(INVENTORY_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const items = data.slice(1).map(row => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index];
    });
    return item;
  }).filter(item => item.id); // Filter out empty rows
  
  return { success: true, data: items };
}

function addItem(item) {
  const sheet = getSpreadsheet().getSheetByName(INVENTORY_SHEET);
  
  const row = [
    item.id || Date.now().toString(),
    item.item,
    item.quantity,
    item.unit,
    item.minQuantity || 1,
    item.store,
    item.category,
    item.priority,
    item.dateAdded || new Date().toISOString(),
    item.lastUpdated || new Date().toISOString(),
    item.addedBy || 'Unknown',
    item.notes || ''
  ];
  
  sheet.appendRow(row);
  
  // Check if item should be on shopping list
  if (item.priority === 'Essential' && Number(item.quantity) <= Number(item.minQuantity)) {
    addToShoppingList({
      id: item.id,
      item: item.item,
      quantityNeeded: item.minQuantity,
      unit: item.unit,
      store: item.store,
      category: item.category,
      priority: item.priority
    });
  }
  
  return { success: true, id: item.id };
}

function addMultipleItems(items) {
  const sheet = getSpreadsheet().getSheetByName(INVENTORY_SHEET);
  
  items.forEach(item => {
    const row = [
      item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      item.item,
      item.quantity || 1,
      item.unit || 'count',
      item.minQuantity || 1,
      item.store || 'Walmart',
      item.category || 'Groceries',
      item.priority || 'Nice-to-Have',
      new Date().toISOString(),
      new Date().toISOString(),
      item.addedBy || 'AI Scan',
      item.notes || ''
    ];
    sheet.appendRow(row);
  });
  
  return { success: true, count: items.length };
}

function updateQuantity(id, quantity) {
  const sheet = getSpreadsheet().getSheetByName(INVENTORY_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.getRange(i + 1, 3).setValue(quantity); // Column C = quantity
      sheet.getRange(i + 1, 10).setValue(new Date().toISOString()); // Column J = lastUpdated
      
      // Check if should add to shopping list
      const minQty = data[i][4];
      const priority = data[i][7];
      
      if (priority === 'Essential' && quantity <= minQty) {
        // Add to shopping list if not already there
        addToShoppingListIfNotExists({
          id: id,
          item: data[i][1],
          quantityNeeded: minQty - quantity + 1,
          unit: data[i][3],
          store: data[i][5],
          category: data[i][6],
          priority: priority
        });
      }
      
      return { success: true };
    }
  }
  
  return { success: false, error: 'Item not found' };
}

function deleteItem(id) {
  const sheet = getSpreadsheet().getSheetByName(INVENTORY_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  return { success: false, error: 'Item not found' };
}

// ==================== SHOPPING LIST FUNCTIONS ====================

function getShoppingList() {
  const sheet = getSpreadsheet().getSheetByName(SHOPPING_LIST_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const items = data.slice(1).map(row => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index];
    });
    return item;
  }).filter(item => item.id);
  
  return { success: true, data: items };
}

function addToShoppingList(item) {
  const sheet = getSpreadsheet().getSheetByName(SHOPPING_LIST_SHEET);
  
  const row = [
    item.id,
    item.item,
    item.quantityNeeded || 1,
    item.unit || 'count',
    item.store,
    item.category,
    item.priority,
    new Date().toISOString(),
    false, // purchased
    ''     // datePurchased
  ];
  
  sheet.appendRow(row);
  return { success: true };
}

function addToShoppingListIfNotExists(item) {
  const sheet = getSpreadsheet().getSheetByName(SHOPPING_LIST_SHEET);
  const data = sheet.getDataRange().getValues();
  
  // Check if item already on list
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == item.id && !data[i][8]) { // Not purchased
      return { success: true, message: 'Already on list' };
    }
  }
  
  return addToShoppingList(item);
}

function togglePurchased(id, purchased) {
  const sheet = getSpreadsheet().getSheetByName(SHOPPING_LIST_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.getRange(i + 1, 9).setValue(purchased); // Column I = purchased
      sheet.getRange(i + 1, 10).setValue(purchased ? new Date().toISOString() : ''); // Column J = datePurchased
      return { success: true };
    }
  }
  
  return { success: false, error: 'Item not found' };
}

function clearPurchasedItems() {
  const sheet = getSpreadsheet().getSheetByName(SHOPPING_LIST_SHEET);
  const data = sheet.getDataRange().getValues();
  
  // Delete from bottom to top to avoid index issues
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][8] === true) {
      sheet.deleteRow(i + 1);
    }
  }
  
  return { success: true };
}

function syncShoppingList() {
  const inventorySheet = getSpreadsheet().getSheetByName(INVENTORY_SHEET);
  const shoppingSheet = getSpreadsheet().getSheetByName(SHOPPING_LIST_SHEET);
  
  const inventoryData = inventorySheet.getDataRange().getValues();
  const shoppingData = shoppingSheet.getDataRange().getValues();
  
  // Get existing shopping list IDs
  const existingIds = new Set();
  for (let i = 1; i < shoppingData.length; i++) {
    if (!shoppingData[i][8]) { // Not purchased
      existingIds.add(shoppingData[i][0]);
    }
  }
  
  let addedCount = 0;
  
  // Check inventory for low essential items
  for (let i = 1; i < inventoryData.length; i++) {
    const id = inventoryData[i][0];
    const item = inventoryData[i][1];
    const quantity = inventoryData[i][2];
    const unit = inventoryData[i][3];
    const minQuantity = inventoryData[i][4];
    const store = inventoryData[i][5];
    const category = inventoryData[i][6];
    const priority = inventoryData[i][7];
    
    // If Essential and quantity <= minQuantity, add to list
    if (priority === 'Essential' && Number(quantity) <= Number(minQuantity) && !existingIds.has(id)) {
      const row = [
        id,
        item,
        Math.max(1, minQuantity - quantity + 1),
        unit,
        store,
        category,
        priority,
        new Date().toISOString(),
        false,
        ''
      ];
      shoppingSheet.appendRow(row);
      addedCount++;
    }
  }
  
  return { success: true, added: addedCount };
}

// ==================== MEAL SUGGESTIONS FUNCTIONS ====================

function getMealSuggestions() {
  const sheet = getSpreadsheet().getSheetByName(MEAL_SUGGESTIONS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { success: true, data: [] };
  }
  
  // Get the most recent suggestion
  const lastRow = data[data.length - 1];
  
  return {
    success: true,
    data: {
      timestamp: lastRow[0],
      meal1: lastRow[1],
      meal2: lastRow[2],
      meal3: lastRow[3],
      ingredients: lastRow[4]
    }
  };
}

function saveMealSuggestions(meals) {
  const sheet = getSpreadsheet().getSheetByName(MEAL_SUGGESTIONS_SHEET);
  
  const row = [
    new Date().toISOString(),
    meals[0] ? `${meals[0].name}: ${meals[0].description}` : '',
    meals[1] ? `${meals[1].name}: ${meals[1].description}` : '',
    meals[2] ? `${meals[2].name}: ${meals[2].description}` : '',
    meals.map(m => m.ingredients || []).flat().join(', ')
  ];
  
  sheet.appendRow(row);
  return { success: true };
}

// ==================== UTILITY FUNCTIONS ====================

function setupSheets() {
  const ss = getSpreadsheet();
  
  // Create Inventory sheet if it doesn't exist
  let inventorySheet = ss.getSheetByName(INVENTORY_SHEET);
  if (!inventorySheet) {
    inventorySheet = ss.insertSheet(INVENTORY_SHEET);
    inventorySheet.appendRow([
      'id', 'item', 'quantity', 'unit', 'minQuantity', 
      'store', 'category', 'priority', 'dateAdded', 
      'lastUpdated', 'addedBy', 'notes'
    ]);
  }
  
  // Create ShoppingList sheet if it doesn't exist
  let shoppingSheet = ss.getSheetByName(SHOPPING_LIST_SHEET);
  if (!shoppingSheet) {
    shoppingSheet = ss.insertSheet(SHOPPING_LIST_SHEET);
    shoppingSheet.appendRow([
      'id', 'item', 'quantityNeeded', 'unit', 'store',
      'category', 'priority', 'dateAdded', 'purchased', 'datePurchased'
    ]);
  }
  
  // Create MealSuggestions sheet if it doesn't exist
  let mealsSheet = ss.getSheetByName(MEAL_SUGGESTIONS_SHEET);
  if (!mealsSheet) {
    mealsSheet = ss.insertSheet(MEAL_SUGGESTIONS_SHEET);
    mealsSheet.appendRow([
      'timestamp', 'meal1', 'meal2', 'meal3', 'ingredientsAvailable'
    ]);
  }
  
  return 'Sheets setup complete!';
}

// Run this function once to set up your sheets
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Pantry App')
    .addItem('Setup Sheets', 'setupSheets')
    .addItem('Sync Shopping List', 'syncShoppingList')
    .addItem('Clear Purchased Items', 'clearPurchasedItems')
    .addToUi();
}
