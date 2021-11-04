const indexedDB = window.indexedDB;

let db;

// Create a new db request for a "budget" database.
const request = indexedDB.open('budget', 1);

request.onupgradeneeded = function (e) {
    let db = e.target.result;
    db.createObjectStore('pending', { autoIncrement: true});
};

request.onsuccess = function (e) {
  console.log('success');
  db = e.target.result;

  // Check if app is online before reading from db
  if (navigator.onLine) {
    console.log('Backend online! 🗄️');
    checkDatabase();
  }
};

request.onerror = function (e) {
    console.log(`Woops! ${e.target.errorCode}`);
};

const saveRecord = (record) => {
  console.log('Save record invoked');
  // Create a transaction on the pending db with readwrite access
  const transaction = db.transaction(['pending'], 'readwrite');

  // Access your Pending object store
  const store = transaction.objectStore('pending');

  // Add record to your store with add method.
  store.add(record);
};

function checkDatabase() {
  console.log('check db invoked');

  // Open a transaction on your BudgetStore db
  let transaction = db.transaction(['pending'], 'readwrite');

  // access your BudgetStore object
  const store = transaction.objectStore('pending');

  // Get all records from store and set to a variable
  const getAll = store.getAll();

  // If the request was successful
  getAll.onsuccess = function () {
    // If there are items in the store, we need to bulk add them when we are back online
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((res) => {
          // If our returned response is not empty
          if (res.length !== 0) {
            // Open another transaction to BudgetStore with the ability to read and write
            transaction = db.transaction(['pending'], 'readwrite');

            // Assign the current store to a variable
            const currentStore = transaction.objectStore('pending');

            // Clear existing entries because our bulk add was successful
            currentStore.clear();
            console.log('Clearing store 🧹');
          }
        });
    }
  };
}

// Listen for app coming back online
window.addEventListener('online', checkDatabase);
