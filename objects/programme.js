import { Category } from "./category.js"

export class Programme {
  constructor({
    start,
    stop,
    "channel": channelId,
    title,
    desc,
    category,
    "sub-title": subTitle,
    "episode-num": episodeNumber
  }) {
    this.channelId = channelId;
    this.start = this.#xmltvTimeToDate(start);
    this.stop = this.#xmltvTimeToDate(stop);
    this.title = title?.text;
    this.subTitle = subTitle?.text;
    this.description = desc?.text;
    if (episodeNumber?.system === "xmltv_ns") {
      Object.assign(this, this.#parseXmltvNs(episodeNumber.text));
    }
    if (category) {
      this.categories = this.#parseCategories(category.text);
    }
  }

  #xmltvTimeToDate(xmltvTime) {
    const regex = new RegExp('^(?<YYYY>\\d{4})(?<MM>\\d{2})(?<DD>\\d{2})(?<HH>\\d{2})(?<mm>\\d{2})(?<ss>\\d{2}) (?<ZZ>(?:\\+|-)\\d{4})', 'gm');
    const subst = `$<YYYY>-$<MM>-$<DD>T$<HH>:$<mm>:$<ss>$<ZZ>`;
    const iso8601String = xmltvTime.replace(regex, subst);
    return new Date(iso8601String);
  }

  #parseXmltvNs(episodeNumber) {
    const regex = new RegExp('^(?<season>\\d+)?(?: *\\\/ *(?<totalSeasons>\\d+))? *\\. *(?<episode>\\d+)(?: *\\\/ *(?<episodesInSeason>\\d+))? *\\. *(?<part>\\d+)?(?: *\\\/ *(?<partsInEpisode>\\d+)?)?', '');
    const numberSystem = episodeNumber.match(regex)?.groups;

    for (const key in numberSystem) {
      numberSystem[key] = Number(numberSystem[key]);
    }
    numberSystem.season += 1;
    numberSystem.episode += 1;
    numberSystem.part += 1;

    return numberSystem;
  }

  #parseCategories(categories) {
    return categories
      .split('/')
      .map((category) => new Category({ name: category.trim() }));
  }
}
