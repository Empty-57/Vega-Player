const indexDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;

class IndexDB{
  constructor() {
    this._db=null;//数据库实例
    this._request = null//请求
    this._dbName = "AudioMetadata";//数据库名
    this._tableName = 'imageCache' //表名
    this._version=1;
  }
  async init_DB() {
    this._request = await indexDB.open(this._dbName, this._version);
    this._request.onsuccess = event => {
      this._db=event.target.result;
      console.log('db open success: ', this._db);
    }
    this._request.onerror = event => {
      console.log('db open error: ', this._db);
    }
    this._request.onupgradeneeded = event => {
      let db=event.target.result;
      if (db.objectStoreNames.contains(this._tableName)){
        const store= db.createObjectStore(this._tableName, {
          keyPath: 'audio_id', // 设置主键
          autoIncrement: true,
        })
        store.createIndex('path', 'path', { unique: false })
        store.createIndex('title', 'title', { unique: false })
        store.createIndex('artist', 'artist', { unique: false })
        store.createIndex('album', 'album', { unique: false })
      }
    }
  }
  async close_db(){
    await this._db.close();
    console.log('db closed');
  }

  async addData(data) {
    const transaction = await this._db.transaction(this._tableName, 'readwrite'); // 启动事务，'readwrite' 表示读写操作
    const store = await transaction.objectStore(this._tableName);
    const add_response = await store.put(data);

    add_response.onsuccess = event => {
      console.log('add success: ', event);
    }
    add_response.onerror = event => {
      console.log('add error: ', event);
    }
  }
  async clearData() {
    const transaction = await this._db.transaction(this._tableName, 'readwrite'); // 启动事务，'readwrite' 表示读写操作
    const store = await transaction.objectStore(this._tableName);
    const clear_response = await store.clear();

    clear_response.onsuccess = event => {
      console.log('clear success: ', event);
    }
    clear_response.onerror = event => {
      console.log('clear error: ', event);
    }
  }

  async deleteData(path) {
    const transaction = await this._db.transaction(this._tableName, 'readwrite'); // 启动事务，'readwrite' 表示读写操作
    const store = await transaction.objectStore(this._tableName);
    const pathIndex=store.index('path')
    const path_requests = await pathIndex.get(path);

    path_requests.onsuccess = async event => {
      const record = event.target.result;
      if (record) {
        await store.delete(record);
        console.log('delete success: ', event);
      }
    }
    path_requests.onerror = event => {
      console.log('delete error: ', event);
    }
  }

  async searchData(text,flag) {
    const transaction = await this._db.transaction(this._tableName, 'readwrite'); // 启动事务，'readwrite' 表示读写操作
    const store = await transaction.objectStore(this._tableName);
    let search_requests;
    if (flag){
      search_requests = await store.openCursor();
    }else {
      const titleIndex=store.index('title')
      search_requests = await titleIndex.openCursor(IDBKeyRange.only(text));
    }

    search_requests.onsuccess = async event => {
      const cursor = event.target.result;
        console.log('search success: ', cursor.value);
    }
    search_requests.onerror = event => {
      console.log('search error: ', event);
    }
  }
}

export default IndexDB;
