import Model from './model.js';
import PostModelsController from "../controllers/PostsController.js";
import LikesController from "../controllers/LikesController.js";

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
        let postsController = new PostModelsController(null);
        let likesController = new LikesController(null);

        instance = super.bindExtraData(instance);

        instance.Author = postsController.author(instance.Id);
        instance.Likes = likesController.getLikes(instance.Id).map(l => l.IdUser);
        instance.LikeNames = likesController.getNames(instance.Id, 3);

        return instance;
    }
}