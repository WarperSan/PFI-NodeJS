import PostModel from '../models/post.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';
import UsersController from "./UsersController.js";

export default class PostModelsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new PostModel()));
    }

    /** Fetches the author of the post with the given id */
    author(id) {
        if (this.repository === null)
            return null;

        let post = this.repository.findByField("Id", id);

        if (post === null)
            return null;

        let userID = post.CreatedBy;

        let userController = new UsersController(null);
        let boundUser = userController.repository.get(userID);

        if (boundUser === null)
            return null;

        delete boundUser.Password;

        return boundUser;
    }

    deleteFromAuthor(id) {
        if (this.repository === null)
            return false;

        this.repository.keepByFilter(i => i.CreatedBy !== id);
        return true;
    }
}