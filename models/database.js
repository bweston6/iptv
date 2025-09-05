export class Database {
  db;

  constructor() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("database");

      request.onerror = (e) => {
        reject(e.target.error);
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (e) => {
        this.db = e.target.result;

        const channelStore = this.db.createObjectStore("channel", { keyPath: "id" });
        channelStore.createIndex("name", "name");
        channelStore.createIndex("stream", "stream");
        channelStore.createIndex("number", "number");
        channelStore.createIndex("icon", "icon");

        const programmeStore = this.db.createObjectStore("programme", { keyPath: "id", autoIncrement: true });
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

        this.db.createObjectStore("programmeCategory", { keyPath: ["programmeId", "channelId"] });

        const categoryStore = this.db.createObjectStore("category", { keyPath: "id", autoIncrement: true });
        categoryStore.createIndex("name", "name", { unique: true });

        resolve(this.db);
      };
    });
  }
}

