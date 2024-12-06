import Model from './model.js';
import PostModelsController from "../controllers/PostsController.js";

export default class Post extends Model {
    constructor() {
        super(true /* secured Id */);

        this.addField('Title', 'string');
        this.addField('Text', 'string');
        this.addField('Category', 'string');
        this.addField('Image', 'asset');
        this.addField('Date', 'integer');

        this.addField('CreatedBy', 'string');

        this.setKey("Title");
    }

    bindExtraData(instance) {
        instance = super.bindExtraData(instance);

        instance.Author = new PostModelsController(null).author(instance.Id);

        return instance;
    }
}