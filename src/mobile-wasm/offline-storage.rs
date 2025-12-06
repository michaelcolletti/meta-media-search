use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;
use web_sys::{
    IdbDatabase, IdbFactory, IdbObjectStore, IdbOpenDbRequest, IdbRequest, IdbTransaction,
    IdbTransactionMode, Window,
};
use serde::{Deserialize, Serialize};
use js_sys::{Array, Date, Object, Reflect};

/// Offline storage configuration
const DB_NAME: &str = "meta-media-offline";
const DB_VERSION: u32 = 1;
const STORE_MEDIA: &str = "media";
const STORE_SEARCHES: &str = "searches";
const STORE_PREFERENCES: &str = "preferences";

/// Storage entry with metadata
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StorageEntry {
    pub key: String,
    pub value: String,
    pub timestamp: f64,
    pub ttl: Option<f64>, // Time to live in milliseconds
    pub size: usize,
}

/// Offline storage manager using IndexedDB
#[wasm_bindgen]
pub struct OfflineStorage {
    db_name: String,
}

#[wasm_bindgen]
impl OfflineStorage {
    #[wasm_bindgen(constructor)]
    pub fn new() -> OfflineStorage {
        OfflineStorage {
            db_name: DB_NAME.to_string(),
        }
    }

    /// Initialize database with object stores
    #[wasm_bindgen]
    pub async fn init(&self) -> Result<(), JsValue> {
        let window = web_sys::window().ok_or("No window object")?;
        let idb = window
            .indexed_db()
            .map_err(|_| "IndexedDB not supported")?
            .ok_or("IndexedDB not available")?;

        let open_request = idb
            .open_with_u32(&self.db_name, DB_VERSION)
            .map_err(|e| format!("Failed to open DB: {:?}", e))?;

        // Setup database schema on upgrade
        let onupgradeneeded = Closure::wrap(Box::new(move |event: web_sys::IdbVersionChangeEvent| {
            let target = event.target().unwrap();
            let request: IdbOpenDbRequest = target.dyn_into().unwrap();
            let db: IdbDatabase = request.result().unwrap().dyn_into().unwrap();

            // Create object stores
            if !db.object_store_names().contains(STORE_MEDIA) {
                let store = db
                    .create_object_store(STORE_MEDIA)
                    .expect("Failed to create media store");
                store
                    .create_index("timestamp", &"timestamp".into())
                    .expect("Failed to create timestamp index");
            }

            if !db.object_store_names().contains(STORE_SEARCHES) {
                let store = db
                    .create_object_store(STORE_SEARCHES)
                    .expect("Failed to create searches store");
                store
                    .create_index("timestamp", &"timestamp".into())
                    .expect("Failed to create timestamp index");
            }

            if !db.object_store_names().contains(STORE_PREFERENCES) {
                db.create_object_store(STORE_PREFERENCES)
                    .expect("Failed to create preferences store");
            }
        }) as Box<dyn FnMut(_)>);

        open_request.set_onupgradeneeded(Some(onupgradeneeded.as_ref().unchecked_ref()));
        onupgradeneeded.forget();

        // Wait for database to open
        let promise = js_sys::Promise::new(&mut |resolve, reject| {
            let onsuccess = Closure::wrap(Box::new(move |event: web_sys::Event| {
                resolve.call1(&JsValue::NULL, &event.target().unwrap()).ok();
            }) as Box<dyn FnMut(_)>);

            let onerror = Closure::wrap(Box::new(move |event: web_sys::Event| {
                reject.call1(&JsValue::NULL, &event.target().unwrap()).ok();
            }) as Box<dyn FnMut(_)>);

            open_request.set_onsuccess(Some(onsuccess.as_ref().unchecked_ref()));
            open_request.set_onerror(Some(onerror.as_ref().unchecked_ref()));

            onsuccess.forget();
            onerror.forget();
        });

        JsFuture::from(promise).await?;
        Ok(())
    }

    /// Store media item offline
    #[wasm_bindgen]
    pub async fn store_media(&self, key: &str, value: &str, ttl_ms: Option<f64>) -> Result<(), JsValue> {
        let entry = StorageEntry {
            key: key.to_string(),
            value: value.to_string(),
            timestamp: Date::now(),
            ttl: ttl_ms,
            size: value.len(),
        };

        self.put_item(STORE_MEDIA, key, &entry).await
    }

    /// Retrieve media item from offline storage
    #[wasm_bindgen]
    pub async fn get_media(&self, key: &str) -> Result<JsValue, JsValue> {
        let entry = self.get_item(STORE_MEDIA, key).await?;

        // Check TTL
        if let Some(entry_obj) = entry.dyn_ref::<Object>() {
            let timestamp: f64 = Reflect::get(entry_obj, &"timestamp".into())?
                .as_f64()
                .unwrap_or(0.0);
            let ttl: Option<f64> = Reflect::get(entry_obj, &"ttl".into())?
                .as_f64();

            if let Some(ttl_ms) = ttl {
                if Date::now() - timestamp > ttl_ms {
                    // Entry expired, delete it
                    self.delete_item(STORE_MEDIA, key).await?;
                    return Err("Entry expired".into());
                }
            }

            Ok(Reflect::get(entry_obj, &"value".into())?)
        } else {
            Ok(entry)
        }
    }

    /// Store search query and results
    #[wasm_bindgen]
    pub async fn store_search(&self, query: &str, results: &str) -> Result<(), JsValue> {
        let entry = StorageEntry {
            key: query.to_string(),
            value: results.to_string(),
            timestamp: Date::now(),
            ttl: Some(3600000.0), // 1 hour TTL
            size: results.len(),
        };

        self.put_item(STORE_SEARCHES, query, &entry).await
    }

    /// Get cached search results
    #[wasm_bindgen]
    pub async fn get_search(&self, query: &str) -> Result<JsValue, JsValue> {
        self.get_media(query).await
    }

    /// Store user preference
    #[wasm_bindgen]
    pub async fn store_preference(&self, key: &str, value: &str) -> Result<(), JsValue> {
        self.put_item(STORE_PREFERENCES, key, &value.into()).await
    }

    /// Get user preference
    #[wasm_bindgen]
    pub async fn get_preference(&self, key: &str) -> Result<JsValue, JsValue> {
        self.get_item(STORE_PREFERENCES, key).await
    }

    /// Clear all offline data
    #[wasm_bindgen]
    pub async fn clear_all(&self) -> Result<(), JsValue> {
        self.clear_store(STORE_MEDIA).await?;
        self.clear_store(STORE_SEARCHES).await?;
        self.clear_store(STORE_PREFERENCES).await?;
        Ok(())
    }

    /// Get storage statistics
    #[wasm_bindgen]
    pub async fn get_stats(&self) -> Result<JsValue, JsValue> {
        let stats = Object::new();

        // This is simplified - real implementation would count items in each store
        Reflect::set(&stats, &"mediaCount".into(), &JsValue::from(0))?;
        Reflect::set(&stats, &"searchCount".into(), &JsValue::from(0))?;
        Reflect::set(&stats, &"preferenceCount".into(), &JsValue::from(0))?;
        Reflect::set(&stats, &"totalSize".into(), &JsValue::from(0))?;

        Ok(stats.into())
    }

    // Private helper methods

    async fn get_db(&self) -> Result<IdbDatabase, JsValue> {
        let window = web_sys::window().ok_or("No window object")?;
        let idb = window
            .indexed_db()
            .map_err(|_| "IndexedDB not supported")?
            .ok_or("IndexedDB not available")?;

        let open_request = idb
            .open_with_u32(&self.db_name, DB_VERSION)
            .map_err(|e| format!("Failed to open DB: {:?}", e))?;

        let promise = js_sys::Promise::new(&mut |resolve, reject| {
            let onsuccess = Closure::wrap(Box::new(move |event: web_sys::Event| {
                let target = event.target().unwrap();
                let request: IdbOpenDbRequest = target.dyn_into().unwrap();
                let db = request.result().unwrap();
                resolve.call1(&JsValue::NULL, &db).ok();
            }) as Box<dyn FnMut(_)>);

            let onerror = Closure::wrap(Box::new(move |_event: web_sys::Event| {
                reject.call1(&JsValue::NULL, &"Failed to open database".into()).ok();
            }) as Box<dyn FnMut(_)>);

            open_request.set_onsuccess(Some(onsuccess.as_ref().unchecked_ref()));
            open_request.set_onerror(Some(onerror.as_ref().unchecked_ref()));

            onsuccess.forget();
            onerror.forget();
        });

        let result = JsFuture::from(promise).await?;
        Ok(result.dyn_into()?)
    }

    async fn put_item(&self, store_name: &str, key: &str, value: &dyn erased_serde::Serialize) -> Result<(), JsValue> {
        let db = self.get_db().await?;
        let transaction = db
            .transaction_with_str_and_mode(store_name, IdbTransactionMode::Readwrite)
            .map_err(|e| format!("Transaction error: {:?}", e))?;
        let store = transaction
            .object_store(store_name)
            .map_err(|e| format!("Store error: {:?}", e))?;

        let js_value = serde_wasm_bindgen::to_value(value)?;
        let request = store
            .put_with_key(&js_value, &key.into())
            .map_err(|e| format!("Put error: {:?}", e))?;

        let promise = js_sys::Promise::new(&mut |resolve, reject| {
            let onsuccess = Closure::wrap(Box::new(move |_event: web_sys::Event| {
                resolve.call0(&JsValue::NULL).ok();
            }) as Box<dyn FnMut(_)>);

            let onerror = Closure::wrap(Box::new(move |_event: web_sys::Event| {
                reject.call1(&JsValue::NULL, &"Put operation failed".into()).ok();
            }) as Box<dyn FnMut(_)>);

            request.set_onsuccess(Some(onsuccess.as_ref().unchecked_ref()));
            request.set_onerror(Some(onerror.as_ref().unchecked_ref()));

            onsuccess.forget();
            onerror.forget();
        });

        JsFuture::from(promise).await?;
        Ok(())
    }

    async fn get_item(&self, store_name: &str, key: &str) -> Result<JsValue, JsValue> {
        let db = self.get_db().await?;
        let transaction = db
            .transaction_with_str(store_name)
            .map_err(|e| format!("Transaction error: {:?}", e))?;
        let store = transaction
            .object_store(store_name)
            .map_err(|e| format!("Store error: {:?}", e))?;

        let request = store
            .get(&key.into())
            .map_err(|e| format!("Get error: {:?}", e))?;

        let promise = js_sys::Promise::new(&mut |resolve, reject| {
            let onsuccess = Closure::wrap(Box::new(move |event: web_sys::Event| {
                let target = event.target().unwrap();
                let request: IdbRequest = target.dyn_into().unwrap();
                let result = request.result().unwrap();
                resolve.call1(&JsValue::NULL, &result).ok();
            }) as Box<dyn FnMut(_)>);

            let onerror = Closure::wrap(Box::new(move |_event: web_sys::Event| {
                reject.call1(&JsValue::NULL, &"Get operation failed".into()).ok();
            }) as Box<dyn FnMut(_)>);

            request.set_onsuccess(Some(onsuccess.as_ref().unchecked_ref()));
            request.set_onerror(Some(onerror.as_ref().unchecked_ref()));

            onsuccess.forget();
            onerror.forget();
        });

        JsFuture::from(promise).await
    }

    async fn delete_item(&self, store_name: &str, key: &str) -> Result<(), JsValue> {
        let db = self.get_db().await?;
        let transaction = db
            .transaction_with_str_and_mode(store_name, IdbTransactionMode::Readwrite)
            .map_err(|e| format!("Transaction error: {:?}", e))?;
        let store = transaction
            .object_store(store_name)
            .map_err(|e| format!("Store error: {:?}", e))?;

        let request = store
            .delete(&key.into())
            .map_err(|e| format!("Delete error: {:?}", e))?;

        let promise = js_sys::Promise::new(&mut |resolve, reject| {
            let onsuccess = Closure::wrap(Box::new(move |_event: web_sys::Event| {
                resolve.call0(&JsValue::NULL).ok();
            }) as Box<dyn FnMut(_)>);

            let onerror = Closure::wrap(Box::new(move |_event: web_sys::Event| {
                reject.call1(&JsValue::NULL, &"Delete operation failed".into()).ok();
            }) as Box<dyn FnMut(_)>);

            request.set_onsuccess(Some(onsuccess.as_ref().unchecked_ref()));
            request.set_onerror(Some(onerror.as_ref().unchecked_ref()));

            onsuccess.forget();
            onerror.forget();
        });

        JsFuture::from(promise).await?;
        Ok(())
    }

    async fn clear_store(&self, store_name: &str) -> Result<(), JsValue> {
        let db = self.get_db().await?;
        let transaction = db
            .transaction_with_str_and_mode(store_name, IdbTransactionMode::Readwrite)
            .map_err(|e| format!("Transaction error: {:?}", e))?;
        let store = transaction
            .object_store(store_name)
            .map_err(|e| format!("Store error: {:?}", e))?;

        let request = store
            .clear()
            .map_err(|e| format!("Clear error: {:?}", e))?;

        let promise = js_sys::Promise::new(&mut |resolve, reject| {
            let onsuccess = Closure::wrap(Box::new(move |_event: web_sys::Event| {
                resolve.call0(&JsValue::NULL).ok();
            }) as Box<dyn FnMut(_)>);

            let onerror = Closure::wrap(Box::new(move |_event: web_sys::Event| {
                reject.call1(&JsValue::NULL, &"Clear operation failed".into()).ok();
            }) as Box<dyn FnMut(_)>);

            request.set_onsuccess(Some(onsuccess.as_ref().unchecked_ref()));
            request.set_onerror(Some(onerror.as_ref().unchecked_ref()));

            onsuccess.forget();
            onerror.forget();
        });

        JsFuture::from(promise).await?;
        Ok(())
    }
}

// Need to add erased-serde support - for now use simpler approach
trait Serialize {
    fn to_js_value(&self) -> Result<JsValue, JsValue>;
}

impl Serialize for StorageEntry {
    fn to_js_value(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(self)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
}
