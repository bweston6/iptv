export class Database {
  constructor(db) {
    this.db = db;
  }

  static async init() {
    const db = await new Promise((res, rej) => {
      const request = indexedDB.open("database");

      request.onupgradeneeded = async e => {
        const db = e.target.result;

        const channelStore = db.createObjectStore("channel", { keyPath: "id" });
        channelStore.createIndex("name", "name");
        channelStore.createIndex("stream", "stream");
        channelStore.createIndex("number", "number");
        channelStore.createIndex("icon", "icon");

        const programmeStore = db.createObjectStore("programme", { keyPath: "id", autoIncrement: true });
        programmeStore.createIndex("channelId", "channelId");
        programmeStore.createIndex("start", "start");
        programmeStore.createIndex("stop", "stop");
        programmeStore.createIndex("title", "title");
        programmeStore.createIndex("subTitle", "subTitle");
        programmeStore.createIndex("description", "description");
        programmeStore.createIndex("season", "season");
        programmeStore.createIndex("totalSeasons", "totalSeasons");
        programmeStore.createIndex("episode", "episode");
        programmeStore.createIndex("episodesInSeason", "episodesInSeason");
        programmeStore.createIndex("part", "part");
        programmeStore.createIndex("partsInEpisode", "partsInEpisode");

        db.createObjectStore("programmeCategory", { keyPath: ["programmeId", "channelId"] });

        const categoryStore = db.createObjectStore("category", { keyPath: "id", autoIncrement: true });
        categoryStore.createIndex("name", "name", { unique: true });
      };

      request.onsuccess = e => res(e.target.result);
      request.onerror = e => rej(e.target.error);
    });

    return new Database(db);
  }

  clearAll() {
    let transaction = this.db.transaction(this.db.objectStoreNames, "readwrite");

    for (const objectStoreName of this.db.objectStoreNames) {
      transaction.objectStore(objectStoreName).clear();
    }

    transaction.commit();

    return new Promise(res => transaction.oncomplete = res);
  }
}
