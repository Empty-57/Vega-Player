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
        this._db = event.target.result;
        if (!this._db.objectStoreNames.contains(this._tableName)) {
          const store = this._db.createObjectStore(this._tableName, {
            keyPath: 'path', // 设置主键
            autoIncrement: false,
          })
          store.createIndex('path', 'path', {unique: false})
          store.createIndex('title', 'title', {unique: false})
          store.createIndex('artist', 'artist', {unique: false})
          store.createIndex('album', 'album', {unique: false})
          console.log('onupgradeneeded: ', event)
        }
        if (!this._db.objectStoreNames.contains('LikesCache')) {
          const store = this._db.createObjectStore('LikesCache', {
            keyPath: 'path', // 设置主键
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
        resolve(event)
      }
      this._request.onerror = event => {
        console.log('db open error: ', event);
      }
    })
  }


  addData(data, table_name = this._tableName) {
    const transaction = this._db.transaction(table_name, 'readwrite'); // 启动事务，'readwrite' 表示读写操作
    const store = transaction.objectStore(table_name);
    const add_response = store.put(data);

    add_response.onerror = event => {
      console.log('add error: ', event);
    }
  }


  deleteData(path = '', table_name = this._tableName) {
    const transaction = this._db.transaction(table_name, 'readwrite'); // 启动事务，'readwrite' 表示读写操作
    const store = transaction.objectStore(table_name);
    const pathIndex = store.index('path')
    const path_requests = pathIndex.openCursor(IDBKeyRange.only(path));


    path_requests.onsuccess = event => {
      const record = event.target.result;
      if (record) {
        // 删除当前记录
        const deleteRequest = store.delete(record.primaryKey);
        deleteRequest.onerror = (e) => {
          console.error('Error deleting record with key:', e);
        };
        // 继续游标，查找下一条匹配记录
        record.continue();
      }
    }
    path_requests.onerror = event => {
      console.log('delete error: ', event);
    }
  }

  searchData(text = '', flag = 0, arr = [], table_name = this._tableName) {
    return new Promise((resolve, reject) => {
      let allData = [];
      const transaction = this._db.transaction(table_name, 'readwrite'); // 启动事务，'readwrite' 表示读写操作
      const store = transaction.objectStore(table_name);
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
          allData.push(cursor.value);
          if (flag === 1) {
            resolve(1)
          }
          cursor.continue()
        } else {
          if (flag === 1) {
            resolve(0)
          }
          if (flag === 0) {
            resolve(allData)
          }
        }
      }
      search_requests.onerror = event => {
        console.log('search error: ', event);
      }
      return [];
    })
  }
}

export default IndexDB;
