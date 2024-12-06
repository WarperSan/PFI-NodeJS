import Model from './model.js';

export default class Like extends Model {
    constructor() {
        super(false);

        this.addField("Id", "string");
        this.addField("IdUser", "string");
        this.addField("IdPost", "string");

        this.setKey("Id");
    }
}