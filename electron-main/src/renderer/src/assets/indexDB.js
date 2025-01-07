const indexDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;

class IndexDB {
  constructor() {
    this._db = null;//数据库实例
    this._request = null//请求
    this._dbName = "AudioMetadata";//数据库名
    this._tableName = 'audioCache' //表名
    this._version = 1;
  }

  init_DB() {
    return new Promise((resolve, reject) => {
      this._request = indexDB.open(this._dbName, this._version);

      this._request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this._tableName)) {
          const store = db.createObjectStore(this._tableName, {
            keyPath: 'audio_id', // 设置主键
            autoIncrement: false,
          })
          store.createIndex('path', 'path', {unique: false})
          store.createIndex('title', 'title', {unique: false})
          store.createIndex('artist', 'artist', {unique: false})
          store.createIndex('album', 'album', {unique: false})
          console.log('onupgradeneeded: ', event)
        }
      }

      this._request.onsuccess = event => {
        this._db = event.target.result;
        console.log('db open success: ', event);
        resolve(true)
      }
      this._request.onerror = event => {
        console.log('db open error: ', event);
      }
    })
  }

  close_db() {
    this._db.close();
    console.log('db closed');
  }

  addData(data) {
    const transaction = this._db.transaction(this._tableName, 'readwrite'); // 启动事务，'readwrite' 表示读写操作
    const store = transaction.objectStore(this._tableName);
    const add_response = store.put(data);

    add_response.onsuccess = event => {
      console.log('add success: ', event);
    }
    add_response.onerror = event => {
      console.log('add error: ', event);
    }
  }

  clearData() {
    const transaction = this._db.transaction(this._tableName, 'readwrite'); // 启动事务，'readwrite' 表示读写操作
    const store = transaction.objectStore(this._tableName);
    const clear_response = store.clear();

    clear_response.onsuccess = event => {
      console.log('clear success: ', event);
    }
    clear_response.onerror = event => {
      console.log('clear error: ', event);
    }
  }

  deleteData(title = '') {
    const transaction = this._db.transaction(this._tableName, 'readwrite'); // 启动事务，'readwrite' 表示读写操作
    const store = transaction.objectStore(this._tableName);
    const titleIndex = store.index('title')
    const title_requests = titleIndex.openCursor(IDBKeyRange.only(title));


    title_requests.onsuccess = event => {
      const record = event.target.result;
      if (record) {
        // 删除当前记录
        const deleteRequest = store.delete(record.primaryKey);
        deleteRequest.onsuccess = () => {
          console.log('Deleted record with key:', event);
        };
        deleteRequest.onerror = (e) => {
          console.error('Error deleting record with key:', e);
        };
        // 继续游标，查找下一条匹配记录
        record.continue();
      } else {
        console.log('title not found: ', event);
      }
    }
    title_requests.onerror = event => {
      console.log('delete error: ', event);
    }
  }

  searchData(text = '', flag = 0, args = null) {
    const transaction = this._db.transaction(this._tableName, 'readwrite'); // 启动事务，'readwrite' 表示读写操作
    const store = transaction.objectStore(this._tableName);
    let search_requests;
    let pathIndex;
    switch (flag) {
      case 0:
        search_requests = store.openCursor();
        break;
      case 1:
        pathIndex = store.index('path')
        search_requests = pathIndex.openCursor(IDBKeyRange.only(text));
        break;
      case 2:
        break;
    }

    search_requests.onsuccess = event => {
      const cursor = event.target.result;
      if (cursor) {
        console.log('search success: ', cursor.value);
        args.push(cursor.value);
        cursor.continue()
      } else {
        console.log('search error: ', event);
      }
    }
    search_requests.onerror = event => {
      console.log('search error: ', event);
    }
    return [];
  }
}

export default IndexDB;
