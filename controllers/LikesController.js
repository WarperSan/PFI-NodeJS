import Repository from '../models/repository.js';
import Controller from './Controller.js';
import Like from "../models/like.js";
import UsersController from "./UsersController.js";
import AccessControl from "../accessControl.js";

export default class LikesController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new Like()), AccessControl.noAPI());
    }

    getLikes(idPost) {
        return this.repository.findByFilter(l => l.IdPost === idPost);
    }

    getNames(id, count) {
        let userController = new UsersController(null);
        let likes = this.getLikes(id).slice(0, count);
        likes = likes.map(l => userController.repository.get(l.IdUser).Name);

        return likes.slice(0, count);
    }

    deleteFromUser(idUser) {
        this.repository.keepByFilter(l => l.IdUser !== idUser);
    }

    deleteFromPost(idPost) {
        this.repository.keepByFilter(l => l.IdPost !== idPost);
    }
}