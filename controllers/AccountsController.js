import UserModel from '../models/user.js';
import Repository from '../models/repository.js';
import TokenManager from '../tokensManager.js';
import * as utilities from "../utilities.js";
import Gmail from "../gmail.js";
import Controller from './Controller.js';
import AccessControl from '../accessControl.js';
import TokensManager from "../tokensManager.js";
import PostModelsController from "./PostsController.js";

export default class AccountsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new UserModel()), AccessControl.admin());
    }

    index(id) {
        if (id != '') {
            if (AccessControl.readGranted(this.HttpContext.authorizations, AccessControl.admin()))
                this.HttpContext.response.JSON(this.repository.get(id));
            else
                this.HttpContext.response.unAuthorized("Unauthorized access");
        } else {
            if (AccessControl.granted(this.HttpContext.authorizations, AccessControl.admin()))
                this.HttpContext.response.JSON(this.repository.getAll(this.HttpContext.path.params), this.repository.ETag, false, AccessControl.admin());
            else
                this.HttpContext.response.unAuthorized("Unauthorized access");
        }
    }

    // POST: /token body payload[{"Email": "...", "Password": "..."}]
    login(loginInfo) {

        // If no payload
        if (!loginInfo) {
            this.HttpContext.response.badRequest("Credential Email and password are missing.");
            return;
        }

        // If repository not initialized
        if (this.repository === null) {
            this.HttpContext.response.notImplemented();
            return;
        }

        let user = this.repository.findByField("Email", loginInfo.Email);

        // If user not found from given email
        if (user === null) {
            this.HttpContext.response.userNotFound("This user email is not found.");
            return;
        }

        // If passwords mismatch
        if (user.Password !== loginInfo.Password) {
            this.HttpContext.response.wrongPassword("Wrong password.");
            return;
        }

        user = this.repository.get(user.Id);

        let newToken = TokenManager.create(user);
        this.HttpContext.response.created(newToken);
    }

    // GET: /accounts/logout?id=...&token=...
    logout() {
        let id = this.HttpContext.path.params.id;

        // If no id given
        if (!id) {
            this.HttpContext.response.badRequest("Id is not specified.")
            return;
        }

        let tokenFound = TokenManager.findUserToken(id);

        // If no token for this user
        if (tokenFound === null) {
            this.HttpContext.response.ok();
            return;
        }

        let token = this.HttpContext.path.params.token;

        if (!token) {
            this.HttpContext.response.badRequest("Token is not specified.")
            return;
        }

        // If tokens mismatch
        if (tokenFound.Access_token !== token) {
            this.HttpContext.response.unAuthorized();
            return;
        }

        TokenManager.logout(id);
        this.HttpContext.response.ok();
    }

    sendVerificationEmail(user) {
        // bypass model bindeExtraData wich hide the user verifyCode
        let html = `
                Bonjour ${user.Name}, <br /> <br />
                Voici votre code pour confirmer votre adresse de courriel
                <br />
                <h3>${user.VerifyCode}</h3>
            `;
        const gmail = new Gmail();
        gmail.send(user.Email, 'Vérification de courriel...', html);
    }

    sendConfirmedEmail(user) {
        let html = `
                Bonjour ${user.Name}, <br /> <br />
                Votre courriel a été confirmé.
            `;
        const gmail = new Gmail();
        gmail.send(user.Email, 'Courriel confirmé...', html);
    }

    //GET : /accounts/verify?id=...&code=.....
    verify() {

        // If repository not initialized
        if (this.repository === null) {
            this.HttpContext.response.notImplemented();
            return;
        }

        let id = this.HttpContext.path.params.id;
        let userFound = this.repository.findByField('Id', id);

        // If no user found with the given ID
        if (!userFound) {
            this.HttpContext.response.unprocessable();
            return;
        }

        let code = parseInt(this.HttpContext.path.params.code);

        // If codes mismatch
        if (userFound.VerifyCode !== code) {
            this.HttpContext.response.unverifiedUser("Verification code does not matched.");
            return;
        }

        userFound.VerifyCode = "verified";
        this.repository.update(userFound.Id, userFound, false);

        // If the model became invalid
        if (!this.repository.model.state.isValid) {
            this.HttpContext.response.unprocessable();
            return;
        }

        userFound = this.repository.get(userFound.Id); // get data binded record
        userFound.token = TokensManager.findUserToken(userFound.Id).Access_token;
        this.HttpContext.response.JSON(userFound);
        this.sendConfirmedEmail(userFound);
    }

    //GET : /accounts/conflict?Id=...&Email=.....
    conflict() {
        if (this.repository != null) {
            let id = this.HttpContext.path.params.Id;
            let email = this.HttpContext.path.params.Email;
            if (id && email) {
                let prototype = {Id: id, Email: email};
                this.HttpContext.response.JSON(this.repository.checkConflict(prototype));
            } else
                this.HttpContext.response.JSON(false);
        } else
            this.HttpContext.response.JSON(false);
    }

    // GET: /accounts/exists?Email=...
    exists() {
        if (this.repository == null) {
            this.HttpContext.response.JSON(false);
            return;
        }

        let email = this.HttpContext.path.params.Email;
        if (!email) {
            this.HttpContext.response.badRequest("No email was provided.");
            return;
        }

        let elements = this.repository.findByFilter((e) => e.Email === email);
        this.HttpContext.response.JSON(elements.length > 0);
    }

    // GET: /accounts/fromToken?token=...
    fromtoken() {
        let accessToken = this.HttpContext.path.params.token;

        // If token not provided
        if (!accessToken) {
            this.HttpContext.response.badRequest("No token was provided.");
            return;
        }

        let token = TokensManager.findAccesToken(accessToken, false);

        if (token == null) {
            this.HttpContext.response.JSON(null);
            return;
        }

        let boundUser = this.repository.get(token.User.Id);
        delete boundUser.Password;

        this.HttpContext.response.JSON(boundUser);
    }

    // POST: account/register body payload[{"Id": 0, "Name": "...", "Email": "...", "Password": "..."}]
    register(user) {

        if (this.repository === null) {
            this.HttpContext.response.notImplemented();
            return;
        }

        user.Created = utilities.nowInSeconds();
        let verifyCode = utilities.makeVerifyCode(6);
        user.VerifyCode = verifyCode;
        user.Authorizations = AccessControl.user();
        let newUser = this.repository.add(user);

        if (!this.repository.model.state.isValid) {
            if (this.repository.model.state.inConflict)
                this.HttpContext.response.conflict(this.repository.model.state.errors);
            else
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
            return;
        }

        this.HttpContext.response.JSON(newUser);
        this.sendVerificationEmail(newUser);
    }

    promote(user) {
        if (this.repository != null) {
            let foundUser = this.repository.findByField("Id", user.Id);
            foundUser.Authorizations.readAccess++;
            if (foundUser.Authorizations.readAccess > 3) foundUser.Authorizations.readAccess = 1;
            foundUser.Authorizations.writeAccess++;
            if (foundUser.Authorizations.writeAccess > 3) foundUser.Authorizations.writeAccess = 1;
            this.repository.update(user.Id, foundUser, false);
            if (this.repository.model.state.isValid) {
                let userFound = this.repository.get(foundUser.Id); // get data binded record
                this.HttpContext.response.JSON(userFound);
            } else
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
        } else
            this.HttpContext.response.notImplemented();
    }

    block(user) {
        if (this.repository != null) {
            let foundUser = this.repository.findByField("Id", user.Id);
            foundUser.Authorizations.readAccess = foundUser.Authorizations.readAccess == 1 ? -1 : 1;
            foundUser.Authorizations.writeAccess = foundUser.Authorizations.writeAccess == 1 ? -1 : 1;
            this.repository.update(user.Id, foundUser, false);
            if (this.repository.model.state.isValid) {
                let userFound = this.repository.get(foundUser.Id); // get data binded record
                this.HttpContext.response.JSON(userFound);
            } else
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
        } else
            this.HttpContext.response.notImplemented();
    }

    // PUT:account/modify body payload[{"Id": 0, "Name": "...", "Email": "...", "Password": "..."}]
    modify(user) {
        // empty asset members imply no change and there values will be taken from the stored record
        if (!AccessControl.writeGranted(this.HttpContext.authorizations, AccessControl.user())) {
            this.HttpContext.response.unAuthorized();
            return;
        }

        if (this.repository === null) {
            this.HttpContext.response.notImplemented();
            return;
        }

        let foundedUser = this.repository.findByField("Id", user.Id);

        if (foundedUser === null) {
            this.HttpContext.response.notFound();
            return;
        }

        if (user.OldPassword !== foundedUser.Password) {
            this.HttpContext.response.wrongPassword("Wrong password.");
            return;
        }
        delete user.OldPassword;

        user.Created = utilities.nowInSeconds();

        // user cannot change its own authorizations
        user.Authorizations = foundedUser.Authorizations;

        // password not changed
        if (user.Password == '')
            user.Password = foundedUser.Password;

        if (user.Email != foundedUser.Email) {
            user.VerifyCode = utilities.makeVerifyCode(6);
            this.sendVerificationEmail(user);
        } else
            user.VerifyCode = foundedUser.VerifyCode;

        this.repository.update(user.Id, user);
        new PostModelsController(null).repository.newETag(); // Make post repository dirty
        let updatedUser = this.repository.get(user.Id); // must get record user.id with binded data

        if (!this.repository.model.state.isValid) {
            if (this.repository.model.state.inConflict)
                this.HttpContext.response.conflict(this.repository.model.state.errors);
            else
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
            return;
        }

        this.HttpContext.response.JSON(updatedUser, this.repository.ETag);
    }

    // GET:account/remove/id
    remove(id) {

        if (id === undefined) {
            this.HttpContext.response.badRequest("No id was provided.");
            return;
        }

        if (this.HttpContext.user.Id !== id && !AccessControl.writeGrantedAdminOrOwner(this.HttpContext.authorizations, this.requiredAuthorizations, id)) {
            this.HttpContext.response.unAuthorized();
            return;
        }

        if (this.repository === null) {
            this.HttpContext.response.notImplemented();
            return;
        }

        new PostModelsController(null).deleteFromAuthor(id);
        this.repository.remove(id);

        if (!this.repository.model.state.isValid) {
            if (this.repository.model.state.inConflict)
                this.HttpContext.response.conflict(this.repository.model.state.errors);
            else
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
            return;
        }

        this.HttpContext.response.ok();
    }
}
