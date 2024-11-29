import Repository from '../models/repository.js';
import Controller from './Controller.js';
import User from "../models/user.js";

export default class UsersController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new User()));
    }
}