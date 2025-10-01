export class Channel {
  constructor({
    id,
    name,
    stream,
    number = null,
    icon = null
  }) {
    this.id = id;
    this.name = name;
    this.stream = stream;
    this.number = Number(number);
    this.icon = icon;
  }
} 
