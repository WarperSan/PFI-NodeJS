import PostModel from '../models/post.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';
import UsersController from "./UsersController.js";
import LikesController from "./LikesController.js";
import AccessControl from "../accessControl.js";

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

    // POST: /posts/togglelike?id=...
    togglelike() {

        let idPost = this.HttpContext.path.params.id;

        if (idPost === null) {
            this.HttpContext.response.badRequest("No post id specified.");
            return;
        }

        if (this.repository === null) {
            this.HttpContext.response.notImplemented();
            return;
        }

        // If user doesn't have authorizations
        if (!AccessControl.readGranted(this.HttpContext.authorizations, AccessControl.user())) {
            this.HttpContext.response.unAuthorized();
            return;
        }

        let post = this.repository.findByField("Id", idPost);

        if (post === null) {
            this.HttpContext.response.notFound("No post was found with the given id.");
            return;
        }

        let user = this.HttpContext.user;

        if (user === null) {
            this.HttpContext.response.notFound("No user was found with the given id.");
            return;
        }

        let likesController = new LikesController(null);
        let likes = likesController.repository.findByFilter(l => l.IdPost === idPost && l.IdUser === user.Id);

        if (likes === null)
        {
            this.HttpContext.response.notImplemented();
            return;
        }

        // Add
        if (likes.length === 0)
            likesController.repository.add({ IdPost: idPost, IdUser: user.Id });
        // Remove
        else
        {
            let likeIds = likes.map(l => l.Id);
            likesController.repository.keepByFilter(l => likeIds.indexOf(l.Id) === -1);
        }

        this.repository.newETag();
        this.HttpContext.response.ok();
    }

    deleteFromAuthor(id) {
        if (this.repository === null)
            return false;

        this.repository.keepByFilter(i => i.CreatedBy !== id);
        return true;
    }
}