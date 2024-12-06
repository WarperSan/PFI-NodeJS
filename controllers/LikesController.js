import Repository from '../models/repository.js';
import Controller from './Controller.js';
import Like from "../models/like.js";

export default class LikesController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new Like()));
    }

    getLikes(idPost) {
        return this.repository.findByFilter(l => l.IdPost === idPost);
    }
}