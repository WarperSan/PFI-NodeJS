////// Author: Nicolas Chourot
////// 2024
//////////////////////////////

const periodicRefreshPeriod = 2;
const waitingGifTrigger = 2000;
const minKeywordLenth = 3;
const keywordsOnchangeDelay = 500;

let categories = [];
let selectedCategory = "";
let currentETag = "";
let currentPostsCount = -1;
let periodic_Refresh_paused = false;
let postsPanel;
let itemLayout;
let waiting = null;
let showKeywords = false;
let keywordsOnchangeTimger = null;

async function Init_UI() {
    postsPanel = new PageManager('postsScrollPanel', 'postsPanel', 'postSample', renderPosts);
    $('#createPost').on("click", async function () {
        showCreatePostForm();
    });
    $('#abort').on("click", async function () {
        showPosts();
    });
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $("#showSearch").on('click', function () {
        toogleShowKeywords();
        showPosts();
    });

    installKeywordsOnkeyupEvent();
    await showPosts();
    start_Periodic_Refresh();
}

/////////////////////////// Search keywords UI //////////////////////////////////////////////////////////

function installKeywordsOnkeyupEvent() {

    $("#searchKeys").on('keyup', function () {
        clearTimeout(keywordsOnchangeTimger);
        keywordsOnchangeTimger = setTimeout(() => {
            cleanSearchKeywords();
            showPosts(true);
        }, keywordsOnchangeDelay);
    });
    $("#searchKeys").on('search', function () {
        showPosts(true);
    });
}

function cleanSearchKeywords() {
    /* Keep only keywords of 3 characters or more */
    let keywords = $("#searchKeys").val().trim().split(' ');
    let cleanedKeywords = "";
    keywords.forEach(keyword => {
        if (keyword.length >= minKeywordLenth) cleanedKeywords += keyword + " ";
    });
    $("#searchKeys").val(cleanedKeywords.trim());
}

function showSearchIcon() {
    //$("#hiddenIcon").hide();
    $("#showSearch").show();
    if (showKeywords) {
        $("#searchKeys").show();
    } else
        $("#searchKeys").hide();
}

function hideSearchIcon() {
    $("#hiddenIcon").show();
    $("#showSearch").hide();
    $("#searchKeys").hide();
}

function toogleShowKeywords() {
    showKeywords = !showKeywords;
    if (showKeywords) {
        $("#searchKeys").show();
        $("#searchKeys").focus();
    } else {
        $("#searchKeys").hide();
        showPosts(true);
    }
}

/////////////////////////// Views management ////////////////////////////////////////////////////////////

async function initialView() {

    let local = await Users_API.GetLocalUser();

    if (local !== null && local.CanWrite) {
        $("#createPost").show();
        $("#hiddenIcon").hide();
    } else {
        $("#createPost").hide();
        $("#hiddenIcon").show();
    }

    $("#hiddenIcon2").hide();
    $('#menu').show();
    $('#commit').hide();
    $('#abort').hide();
    $('#form').hide();
    $('#form').empty();
    $('#aboutContainer').hide();
    $('#errorContainer').hide();
    $(LOGIN_CONTAINER_ID).hide();
    $(USER_FORM_CONTAINER_ID).hide();
    $(ADMIN_PANEL_CONTAINER_ID).hide();
    showSearchIcon();
}

async function showPosts(reset = false) {
    await initialView();
    setTitle("Fil de nouvelles");
    periodic_Refresh_paused = false;
    await postsPanel.show(reset);
}

function hidePosts() {
    postsPanel.hide();
    hideSearchIcon();
    $("#createPost").hide();
    $('#menu').hide();
    periodic_Refresh_paused = true;
}

function showForm() {
    hidePosts();
    $('#form').show();
    $('#commit').show();
    $('#abort').show();
}

function showError(message, details = "") {
    hidePosts();
    $('#form').hide();
    $('#form').empty();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#commit').hide();
    $('#abort').show();
    setTitle("Erreur du serveur...");
    hideLogin();
    hideAdminPanel();
    $(USER_FORM_CONTAINER_ID).hide();
    $("#errorContainer").show();
    $("#errorContainer").empty();
    $("#errorContainer").append($(`<div>${message}</div>`));
    $("#errorContainer").append($(`<div>${details}</div>`));
}

function showCreatePostForm() {
    showForm();
    setTitle("Ajout de nouvelle");
    renderPostForm();
}

function showEditPostForm(id) {
    showForm();
    setTitle("Modification");
    renderEditPostForm(id);
}

function showDeletePostForm(id) {
    showForm();
    setTitle("Retrait");
    renderDeletePostForm(id);
}

function showAbout() {
    hidePosts();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#abort').show();
    setTitle("À propos...");
    $("#aboutContainer").show();
}

//////////////////////////// Utils /////////////////////////////////////////////////////////////

const TITLE_ID = "#viewTitle";
const FORMS_CONTAINER_ID = "#content";

/** Sets the title of the page to the given title */
function setTitle(title) {
    $(TITLE_ID).text(title);
}

/** Fetches the container with the given id */
function getContainer(id) {
    let container = $(id);

    // If already created
    if (container.length !== 0)
        return container;

    $(FORMS_CONTAINER_ID).append($(`<div id="${id.substring(1)}"></div>`));
    return getContainer(id);
}

//////////////////////////// Log in /////////////////////////////////////////////////////////////

const LOGIN_CONTAINER_ID = "#loginContainer";
const LOGIN_FORM_ID = "#loginForm";

const LOGIN_EMAIL_ID = "#loginEmail";
const LOGIN_PASSWORD_ID = "#loginPassword";
const LOGIN_ERROR_CLASS = ".loginError";

/** Shows the login form */
function showLogin() {
    hidePosts();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#abort').show();
    setTitle("Connexion");

    const SIGNUP_BUTTON = "#signup-btn";

    let container = getContainer(LOGIN_CONTAINER_ID);
    container.empty();
    container.append($(`
        <form class="form" id="${LOGIN_FORM_ID.substring(1)}">
            <input class="form-control" name="Email" id="${LOGIN_EMAIL_ID.substring(1)}" placeholder="Courriel" required="" value="" type="email">
            <input class="form-control" name="Password" id="${LOGIN_PASSWORD_ID.substring(1)}" placeholder="Mot de passe" required="" value="" type="password">

            <input type="submit" value="Entrer" class="primary">
        </form>
        
        <hr>
        
        <button id="${SIGNUP_BUTTON.substring(1)}" class="secondary">Nouveau compte</button>
    `));

    container.find("form").on("submit", onLoginSubmit);
    container.find(SIGNUP_BUTTON).on("click", showSignUp);

    container.show();

    initFormValidation();
}

/** Hides the login form */
function hideLogin() {
    $(LOGIN_CONTAINER_ID).hide();
}

/** Called when the login form is submitted */
async function onLoginSubmit(event) {
    event.preventDefault();
    $(LOGIN_ERROR_CLASS).remove();

    let credentials = {
        Email: $(LOGIN_EMAIL_ID).val(),
        Password: $(LOGIN_PASSWORD_ID).val(),
    };

    // Check if credentials are valid
    let token = await Users_API.Login(credentials);

    // If credentials invalid, show error
    if (Users_API.error) {
        onLoginError(Users_API.currentHttpError);
        return;
    }

    onLoginSuccess(token);
}

/** Called when the login form received a success */
function onLoginSuccess(token) {
    // Check if token acquired
    let accessToken = token.Access_token;

    if (accessToken === null) {
        showError("Une erreur est survenue! ");
        return;
    }

    let user = token.User;

    if (user === null) {
        showError("Une erreur est survenue! ");
        return;
    }

    // If user already verified, skip
    if (user.Verified) {
        onCompleteLogin(accessToken, user);
        return;
    }

    showUserVerification(user.Id);
}

/** Called when the login process is complete */
function onCompleteLogin(token, user) {
    Users_API.SetToken(token);

    hideUserForm();
    hideLogin();
    showPosts();

    console.log("LOGGED");

    //initTimeout(10, logout);
    //startCountdown();
}

/** Called when the login form received an error */
function onLoginError(errorMessage) {
    let inputID = "";

    if (errorMessage === "This user email is not found.") {
        errorMessage = "Courriel introuvable";
        inputID = LOGIN_EMAIL_ID;
    } else if (errorMessage === "Wrong password.") {
        errorMessage = "Mot de passe incorrect";
        inputID = LOGIN_PASSWORD_ID;
    }  else if (errorMessage === "This user is blocked.") {
        errorMessage = "Ce compte a été bloqué par un administrateur";
        inputID = LOGIN_PASSWORD_ID;
    }

    $(inputID).after($(`<p class="${LOGIN_ERROR_CLASS.substring(1)}">${errorMessage}</p>`));
}

//////////////////////////// Log out /////////////////////////////////////////////////////////////

/** Logs out the connected user */
async function logout() {
    await Users_API.Logout();

    initialView();
    updateDropDownMenu();
    await postsPanel.show(false);
}

//////////////////////////// Sign up /////////////////////////////////////////////////////////////

const USER_FORM_CONTAINER_ID = "#userFormContainer";
const USER_FORM_ID = "#userForm";

const USER_FORM_CANCEL_BUTTON_ID = "#userCancelButton";
const USER_FORM_DELETE_BUTTON_ID = "#userDeleteButton";

const SIGNUP_EMAIL_ID = "#signupEmail";
const SIGNUP_EMAIL_VERIFY_ID = "#signupEmailVerify";
const SIGNUP_PASSWORD_ID = "#signupPassword"
const SIGNUP_OLD_PASSWORD_ID = "#oldPassword"
const SIGNUP_PASSWORD_VERIFY_ID = "#signupPasswordVerify"
const SIGNUP_NAME_ID = "#signupName";

/** Shows the signup form */
function showSignUp() {
    hidePosts();
    hideLogin();
    $('#abort').show();
    setTitle("Inscription");

    let user = createEmptyUser();
    renderUserForm(user, true, createUserCallback);
}

/** Hides the signup form */
function hideUserForm() {
    $(USER_FORM_CONTAINER_ID).hide();
}

/** Creates an empty user */
function createEmptyUser(avatar = "no-avatar.png") {
    let user = {};
    user.Id = 0;
    user.Name = "";
    user.Email = "";
    user.Password = "";
    user.Avatar = avatar;

    return user;
}

/** Renders a user form from the given user */
function renderUserForm(user, isCreating, renderCallback = undefined) {
    let oldPasswordField = isCreating
        ? ""
        : `<input class="form-control" name="OldPassword" id="${SIGNUP_OLD_PASSWORD_ID.substring(1)}" placeholder="Ancien mot de passe" required="" value="" type="password">`;

    let form = getContainer(USER_FORM_CONTAINER_ID);
    form.empty();
    form.append($(`
        <form class="form" id="${USER_FORM_ID.substring(1)}">
            <input type="hidden" name="Id" value="${user.Id}">
            
            <fieldset class="form-control">
                <legend>Adresse de courriel</legend>
                <input class="form-control" name="Email" id="${SIGNUP_EMAIL_ID.substring(1)}" placeholder="Courriel" required="" value="${user.Email}" type="text">
                <input 
                    class="form-control" 
                    name="EmailVerify" 
                    matchedInputId="${SIGNUP_EMAIL_ID.substring(1)}"
                    id="${SIGNUP_EMAIL_VERIFY_ID.substring(1)}" 
                    placeholder="Vérification" 
                    required="" 
                    value="${user.Email}" 
                    type="text">
            </fieldset>
            
            <fieldset class="form-control">
                <legend>Mot de passe</legend>
            
                ${oldPasswordField}
                
                <input class="form-control" name="Password" id="${SIGNUP_PASSWORD_ID.substring(1)}" placeholder="Mot de passe" ${isCreating ? "required=''" : ""} value="" type="password">
                <input 
                    class="form-control MatchedInput" 
                    name="PasswordVerify" 
                    matchedInputId="${SIGNUP_PASSWORD_ID.substring(1)}"
                    id="${SIGNUP_PASSWORD_VERIFY_ID.substring(1)}" 
                    placeholder="Vérification" 
                    ${isCreating ? "required=''" : ""}
                    value="" 
                    type="password">

            </fieldset>
            
            <fieldset class="form-control">
                <legend>Nom</legend>
                <input class="form-control" name="Name" id="${SIGNUP_NAME_ID.substring(1)}" placeholder="Nom" required="" value="${user.Name}" type="text">
            </fieldset>
            
            <fieldset class="form-control">
                <legend>Avatar</legend>
                
                <div class='imageUploaderContainer'>
                    <div class='imageUploader' 
                        newImage='${isCreating}' 
                        controlId='Avatar' 
                        imageSrc='${user.Avatar}' 
                        waitingImage="Loading_icon.gif">
                    </div>
                </div>
            </fieldset>
            
            <input type="submit" value="Enregistrer" id="saveUser">
        </form>
    `));

    if (renderCallback !== null && renderCallback !== undefined)
        renderCallback(form);

    form.show();

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!
}

/** Called when rendering a form designated to create a new user */
function createUserCallback(form) {
    form.append($(`<div><button id="${USER_FORM_CANCEL_BUTTON_ID.substring(1)}">Annuler</button></div>`));

    form.find(SIGNUP_EMAIL_ID).attr("CustomErrorMessage", "Ce courriel est déjà utilisé");
    form.find(SIGNUP_EMAIL_ID).blur(createUserEmailVerify);
    form.find(USER_FORM_ID).on("submit", createUserFormSubmit);
    form.find(USER_FORM_CANCEL_BUTTON_ID).on("click", function () {
        form.hide();
        showLogin();
    });
}

/** Called when an email is needed to be unique among users */
async function createUserEmailVerify(event) {
    let email = $(this).val();

    if (email === null || email === "")
        return;

    // Find all emails
    let exists = await Users_API.EmailExists(email);

    // Check if email already exist
    if (Users_API.error || !exists)
        return;

    event.target.setCustomValidity("ERROR");
    event.target.reportValidity();
}

/** Called when the user creation form is submitted */
async function createUserFormSubmit(event) {
    event.preventDefault();
    let newUser = getFormData($(USER_FORM_ID));

    // Remove extra fields
    delete newUser.EmailVerify;
    delete newUser.PasswordVerify;

    newUser = await Users_API.Register(newUser);

    if (Users_API.error) {
        showError("Une erreur est survenue!");
        return;
    }

    // If form is valid, show pop up for verification code
    showUserVerification(newUser.Id);
}

//////////////////////////// User modification /////////////////////////////////////////////////////////////

/** Shows the modification form */
async function showModifyUser() {
    let localUser = await Users_API.GetLocalUser();

    if (Users_API.error)
        return;

    if (localUser === null)
        return;

    hidePosts();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#abort').show();
    setTitle("Modification");

    renderUserForm(localUser, false, modifyUserCallback);
}

/** Called when rendering a form designated to modify a user */
function modifyUserCallback(form) {
    form.append($(`<div><button id="${USER_FORM_DELETE_BUTTON_ID.substring(1)}">Effacer le compte</button></div>`));
    form.find(USER_FORM_DELETE_BUTTON_ID).on("click", deleteLocalUser);
    form.find(USER_FORM_ID).on("submit", modifyUserFormSubmit);
}

/** Called when the user modification form is submitted */
async function modifyUserFormSubmit(event) {
    event.preventDefault();
    let newUser = getFormData($(USER_FORM_ID));

    // Remove extra fields
    delete newUser.EmailVerify;
    delete newUser.PasswordVerify;

    await Users_API.Modify(newUser);

    if (Users_API.error) {

        if (Users_API.currentHttpError === "Wrong password.") {
            let oldPassword = $(SIGNUP_OLD_PASSWORD_ID);
            oldPassword.attr("CustomErrorMessage", "L'ancien mot de passe n'est pas votre mot de passe actuel.")
            oldPassword[0].setCustomValidity("ERROR");
            oldPassword[0].reportValidity();
        } else
            showError("Une erreur est survenue!");
        return;
    }

    hideUserForm();
    showPosts();
}

async function deleteLocalUser() {
    let user = await Users_API.GetLocalUser();

    if (Users_API.error) {
        showError("Une erreur est survenue!");
        return;
    }

    if (user === null)
        return;

    showUserDeletion(user.Id);
}

//////////////////////////// Admin panel /////////////////////////////////////////////////////////////

const ADMIN_PANEL_CONTAINER_ID = "#adminPanelContainer";
const ADMIN_PANEL_USERS_ID = "#adminPanelUsers";
const ADMIN_PANEL_PROMOTE_USER_CLASS = ".adminPanelPromoteUser";
const ADMIN_PANEL_DELETE_USER_CLASS = ".adminPanelDeleteUser";
const ADMIN_PANEL_BLOCK_USER_CLASS = ".adminPanelBlockUser";

/** Shows the admin panel */
async function showAdminPanel() {
    hidePosts();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#abort').show();
    setTitle("Gestion des usagers");

    let users = await Users_API.GetAllUsers();

    if (Users_API.error)
    {
        showError("Une erreur est survenue!");
        return;
    }

    let container = getContainer(ADMIN_PANEL_CONTAINER_ID);
    container.empty();
    container.append($(`
        <div id="${ADMIN_PANEL_USERS_ID.substring(1)}"></div>
    `));

    let list = container.find(ADMIN_PANEL_USERS_ID);

    for (const user of users)
        renderAdminPanelUser(user, list);

    container.show();
}

/** Hides the admin panel */
function hideAdminPanel() {
    $(ADMIN_PANEL_CONTAINER_ID).hide();
}

/** Renders an user in the admin panel */
function renderAdminPanelUser(user, panel) {

    let userName = user.Name;

    let userVerifiedTooltip = user.Verified ? `${userName} est vérifié` : `${userName} n'est pas vérifié`;
    let userVerified = user.Verified
        ? `<div class="fa-solid fa-circle-check" style="color:green;" title="${userVerifiedTooltip}"></div>`
        : `<div class="fa-solid fa-circle-xmark" style="color:red;" title="${userVerifiedTooltip}"></div>`;

    let userRole = "";
    let userRoleTooltip = "";

    if (user.isAdmin)
    {
        userRole = "fa-solid fa-user-tie admin-icon-user";
        userRoleTooltip = `${userName} est un administrateur`;
    }
    else if (user.isSuper)
    {
        userRole = "fa-solid fa-user-plus super-icon-user";
        userRoleTooltip = `${userName} est un super usager`;
    }
    else
    {
        userRole = "fa-solid fa-user user-icon-user";
        userRoleTooltip = `${userName} est un usager standard`;
    }

    let userBlockedTooltip = user.isBlocked ? `${userName} est bloqué` : `${userName} n'est pas bloqué`;
    let userBlocked = user.isBlocked
        ? `<div class='fa-solid fa-lock ${ADMIN_PANEL_BLOCK_USER_CLASS.substring(1)}' title='${userBlockedTooltip}'></div>`
        : `<div class='fa-solid fa-unlock ${ADMIN_PANEL_BLOCK_USER_CLASS.substring(1)}' title="${userBlockedTooltip}"></div>`;

    console.log(user);
    panel.append($(`
        <div class="adminPanelUser">
            <div class="adminPanelUserLeft">
                <div class="adminPanelUserAvatar" style="background-image: url('${user.Avatar}');"></div>
                <span>${user.Name}</span>
                ${userVerified}
            </div>
            <div class="adminPanelUserRight">
                <div class="${userRole} ${ADMIN_PANEL_PROMOTE_USER_CLASS.substring(1)}" title="${userRoleTooltip}"></div>
                ${userBlocked}
                <div class="fa-solid fa-trash ${ADMIN_PANEL_DELETE_USER_CLASS.substring(1)}" style="color:red; cursor:pointer;" title="Supprimer le compte de ${userName}"></div>
            </div>
        </div>
    `));

    panel.find(ADMIN_PANEL_PROMOTE_USER_CLASS).on("click", function () {
        onAdminPanelPromote(user);
    });

    panel.find(ADMIN_PANEL_BLOCK_USER_CLASS).on("click", function () {
        onAdminPanelBlock(user);
    });

    panel.find(ADMIN_PANEL_DELETE_USER_CLASS).on("click", function () {
        onAdminPanelDelete(user);
    });
}

/** Called when the admin promotes a user */
async function onAdminPanelPromote(user) {
    await Users_API.PromoteUser(user.Id);

    if (Users_API.error)
    {
        showError("Une erreur est survenue!");
        return;
    }

    showAdminPanel();
}

/** Called when the admin blocks a user */
async function onAdminPanelBlock(user) {
    await Users_API.BlockUser(user.Id);

    if (Users_API.error)
    {
        showError("Une erreur est survenue!");
        return;
    }

    showAdminPanel();
}

/** Called when the admin deletes a user */
async function onAdminPanelDelete(user) {
    showUserDeletion(user.Id, async function () {
        if (Users_API.error)
        {
            showError("Une erreur est survenue!");
            return;
        }

        showAdminPanel();
    });
}

//////////////////////////// User Verification /////////////////////////////////////////////////////////////

const USER_VERIFICATION_POPUP_ID = "#verificationModal";
const USER_VERIFICATION_CONFIRM_ID = "#confirmCode";
const USER_VERIFICATION_RETURN_ID = "#returnToLogin";
const USER_VERIFICATION_CODE_INPUT_ID = "#verificationCode";

/** Shows the user verification popup */
function showUserVerification(id) {
    $(USER_VERIFICATION_POPUP_ID).modal('show');

    $(USER_VERIFICATION_CONFIRM_ID).off('click');
    $(USER_VERIFICATION_RETURN_ID).off('click');

    $(USER_VERIFICATION_CONFIRM_ID).on('click', function () {
        onUserVerificationConfirm(id);
    });
    $(USER_VERIFICATION_RETURN_ID).on('click', onUserVerificationReturn);
}

/** Hides the user verification popup */
function hideUserVerification() {
    $(USER_VERIFICATION_POPUP_ID).modal('hide');
}

/** Called when the user confirms the user verification popup */
async function onUserVerificationConfirm(id) {
    let code = $(USER_VERIFICATION_CODE_INPUT_ID).val();
    code = code.trim();

    $(USER_VERIFICATION_CODE_INPUT_ID).val("");

    let user = await Users_API.Verify(id, code);

    if (Users_API.error) {

        if (Users_API.currentHttpError === "Verification code does not matched.")
            showError("Le code entré n'est pas valide.", "Veuillez vérifier si vous n'avez pas oublié un chiffre.");
        else
            showError("Un erreur est survenue!");
        return;
    }

    hideUserVerification();

    onCompleteLogin(user.token, user);
}

/** Called when the user returns from the user verification popup */
function onUserVerificationReturn() {
    hideUserVerification();
    hideUserForm();
    showLogin();
}

//////////////////////////// User Deletion /////////////////////////////////////////////////////////////

const USER_DELETION_POPUP_ID = "#deletionModal";
const USER_DELETION_CONFIRM_ID = "#deletionModalConfirmBtn";
const USER_DELETION_CANCEL_ID = "#deletionModalCancelBtn";

/** Shows the user deletion popup */
function showUserDeletion(id, callback = undefined) {
    $(USER_DELETION_POPUP_ID).modal('show');

    $(USER_DELETION_CONFIRM_ID).off();
    $(USER_DELETION_CANCEL_ID).off();

    callback ??= async function () {
        hideUserForm();
        logout();

        if (Users_API.error) {
            showError("Une erreur est survenue!");
            return;
        }

        showPosts();
    };

    $(USER_DELETION_CONFIRM_ID).on('click', function () {
        onUserDeletionConfirm(id, callback);
    });
    $(USER_DELETION_CANCEL_ID).on('click', onUserDeletionCancel);
}

/** Hides the user deletion popup */
function hideUserDeletion() {
    $(USER_DELETION_POPUP_ID).modal('hide');
}

async function onUserDeletionConfirm(id, callback) {
    await Users_API.Delete(id);

    hideUserDeletion();
    await callback();
}

/** Called when the user cancels the user deletion popup */
function onUserDeletionCancel() {
    hideUserDeletion();
}

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

function start_Periodic_Refresh() {
    $("#reloadPosts").addClass('white');
    $("#reloadPosts").on('click', async function () {
        $("#reloadPosts").addClass('white');
        postsPanel.resetScrollPosition();
        await showPosts();
    })
    setInterval(async () => {
            if (!periodic_Refresh_paused) {
                let etag = await Posts_API.HEAD();
                // the etag contain the number of model records in the following form
                // xxx-etag
                let postsCount = parseInt(etag.split("-")[0]);
                if (currentETag != etag) {
                    if (postsCount != currentPostsCount) {
                        console.log("postsCount", postsCount)
                        currentPostsCount = postsCount;
                        $("#reloadPosts").removeClass('white');
                    } else
                        await showPosts();
                    currentETag = etag;
                }
            }
        },
        periodicRefreshPeriod * 1000);
}

async function renderPosts(queryString) {
    queryString += "&sort=date,desc";
    compileCategories();
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    if (showKeywords) {
        let keys = $("#searchKeys").val().replace(/[ ]/g, ',');
        if (keys !== "")
            queryString += "&keywords=" + $("#searchKeys").val().replace(/[ ]/g, ',')
    }
    addWaitingGif();
    let response = await Posts_API.Get(queryString);

    if (Posts_API.error) {
        showError(Posts_API.currentHttpError);
        return false;
    }

    let endOfData = false;

    currentETag = response.ETag;
    currentPostsCount = parseInt(currentETag.split("-")[0]);
    let Posts = response.data;
    if (Posts.length > 0) {
        let localUser = await Users_API.GetLocalUser();
        Posts.forEach(Post => {
            postsPanel.append(renderPost(Post, localUser));
        });
    } else
        endOfData = true;
    linefeeds_to_Html_br(".postText");
    highlightKeywords();
    attach_Posts_UI_Events_Callback();

    removeWaitingGif();
    return endOfData;
}

async function compileCategories() {
    categories = [];
    let response = await Posts_API.GetQuery("?fields=category&sort=category");
    if (!Posts_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            if (!categories.includes(selectedCategory))
                selectedCategory = "";
            updateDropDownMenu(categories);
        }
    }
}

function attach_Posts_UI_Events_Callback() {

    linefeeds_to_Html_br(".postText");
    // attach icon command click event callback
    $(".moreText").off();
    $(".moreText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).show();
        $(`.lessText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('showExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('hideExtra');
    })
    $(".lessText").off();
    $(".lessText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).hide();
        $(`.moreText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        postsPanel.scrollToElem($(this).attr("postId"));
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('hideExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('showExtra');
    })
}

function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        postsPanel.itemsPanel.append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}

function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}

const POST_AUTHOR_AVATAR_CLASS = ".postAuthorAvatar";
const POST_AUTHOR_NAME_CLASS = ".postAuthorName";
const POST_ICONS_CLASS = ".postIcons";
const POST_LIKE_CLASS = ".likeCmd";

/** Renders the given post for the given user */
function renderPost(post, loggedUser) {
    let date = convertToFrenchDate(UTC_To_Local(post.Date));

    let render = $(`
        <div class="post" id="${post.Id}">
            <div class="postHeader">
                <div>${post.Category}</div>
                <div class="${POST_ICONS_CLASS.substring(1)}"></div>
            </div>
            <div class="postTitle"> ${post.Title} </div>
            <img class="postImage" src='${post.Image}'/>
            <div style="display: flex;">
                <div class="postAuthorSection">
                    <div class="${POST_AUTHOR_AVATAR_CLASS.substring(1)}"></div>
                    <div class="${POST_AUTHOR_NAME_CLASS.substring(1)}"></div>
                </div>
                <div class="postDate"> ${date} </div>
            </div>
            <div postId="${post.Id}" class="postTextContainer hideExtra">
                <div class="postText" >${post.Text}</div>
            </div>
            <div class="postfooter">
                <span postId="${post.Id}" class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
                <span postId="${post.Id}" class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
            </div>         
        </div>
    `);

    addPostActionIcons(loggedUser, post, render.find(POST_ICONS_CLASS));
    setPostAuthor(render, post.Author);

    return render;
}

/** Renders the post actions depending on the local user and the given post */
function addPostActionIcons(localUser, post, iconsPanel) {
    let isLogged = localUser !== null;
    let isAuthor = isLogged && localUser.Id === post.Author.Id;
    let isAdmin = isLogged && localUser.isAdmin;

    if (isAdmin)
        postAdminIcons(localUser, post, iconsPanel, isAuthor);

    if (isAuthor)
        postAuthorIcons(localUser, post, iconsPanel);

    postEveryoneIcons(localUser, post, iconsPanel);
}

/** Sets the icons on a post for the admin */
function postAdminIcons(localUser, post, iconsPanel, isAuthor) {
    if (!isAuthor) {
        let deleteIcon = $(`<span class="deleteCmd cmdIconSmall fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>`);
        deleteIcon.on("click", function () {
            showDeletePostForm($(this).attr("postId"));
        });
        iconsPanel.append(deleteIcon);
    }
}

/** Sets the icons on a post for the author */
function postAuthorIcons(localUser, post, iconsPanel) {
    let editIcon = $(`<span class="editCmd cmdIconSmall fa fa-pencil" postId="${post.Id}" title="Modifier nouvelle"></span>`);
    editIcon.on("click", function () {
        showEditPostForm($(this).attr("postId"));
    });
    iconsPanel.append(editIcon);

    let deleteIcon = $(`<span class="deleteCmd cmdIconSmall fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>`);
    deleteIcon.on("click", function () {
        showDeletePostForm($(this).attr("postId"));
    });
    iconsPanel.append(deleteIcon);
}

/** Sets the icons on a post for everyone */
function postEveryoneIcons(localUser, post, iconsPanel) {
    let likes = post.Likes ?? [];

    let likeIcon = $(`
        <span class="${POST_LIKE_CLASS.substring(1)} cmdIconSmall fa-regular fa-thumbs-up">${likes.length}</span>
    `);
    iconsPanel.append(likeIcon);

    // If logged in
    if (localUser !== null) {
        if (post.Likes.indexOf(localUser.Id) !== -1) {
            likeIcon.addClass('fa-solid');
            likeIcon.removeClass("fa-regular");
        }

        likeIcon.on("click", function () {
            onPostLiked(post);
        });
    } else
        likeIcon.css("cursor", "initial");

    setPostLikers(iconsPanel, post);
}

/** Called when a post is either liked or unliked */
async function onPostLiked(post) {
    let localUser = await Users_API.GetLocalUser();

    if (Users_API.error || localUser === null)
        return;

    await Posts_API.ToggleLike(post.Id, localUser.Id);

    if (Posts_API.error)
        return;

    await postsPanel.update(false);
}

/** Sets the author information of the given post */
function setPostAuthor(element, author) {

    let name = "???";
    let avatar = "no-avatar.png";

    if (author) {
        name = author.Name;
        avatar = author.Avatar;
    }

    element.find(POST_AUTHOR_AVATAR_CLASS).css("background-image", `url(${avatar})`);
    element.find(POST_AUTHOR_AVATAR_CLASS).css("background-image", `url(${avatar})`);
    element.find(POST_AUTHOR_NAME_CLASS).text(name);
}

/** Sets the names of the first people who liked this post */
async function setPostLikers(element, post) {
    element.find(POST_LIKE_CLASS).prop("title", post.LikeNames.join("\n"));
}

//////////////////////////// Dropdown menu /////////////////////////////////////////////////////////////

const DROPDOWN_MENU_ID = "#DDMenu";

/** Updates the dropdown menu with new items */
async function updateDropDownMenu() {
    $(DROPDOWN_MENU_ID).empty();

    if (Users_API.IsUserLoggedIn())
        await addLoggedInItems();
    else
        addLoggedOutItems();

    addDropdownDivider();

    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    let allCategories = addDropdownItem("Toutes les catégories", "allCatCmd", `fa ${selectClass}`);
    allCategories.on("click", async function () {
        selectedCategory = "";
        await showPosts(true);
    });

    addDropdownDivider();

    categories.forEach(category => {

        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        let cat = addDropdownItem(category, undefined, `fa ${selectClass}`);
        cat.on("click", async function () {
            selectedCategory = $(this).text().trim();
            await showPosts(true);
        });
    });

    addDropdownDivider();

    let about = addDropdownItem("À propos...", "aboutCmd", "fa fa-info-circle");
    about.on("click", showAbout);
}

/** Adds an HTML element on the dropdown menu */
function addDropdownElement(element) {
    $(DROPDOWN_MENU_ID).append(element);
}

/** Adds an item on the dropdown menu */
function addDropdownItem(text, id, classes) {
    let item = $(`
        <div class="dropdown-item menuItemLayout" id="${id}">
            <i class="menuIcon mx-2 ${classes}"></i> ${text}
        </div>
    `);
    addDropdownElement(item);
    return item;
}

/** Adds a divider on the dropdown menu */
function addDropdownDivider() {
    $(DROPDOWN_MENU_ID).append($(`<div class="dropdown-divider"></div> `));
}

/** Adds the dropdown items for a logged-out user */
function addLoggedOutItems() {
    let connection = addDropdownItem("Connexion", "connectionCmd", "fa-solid fa-arrow-right-to-bracket");
    connection.on("click", function () {
        showLogin();
    });
}

/** Adds the dropdown items for a logged-in user */
async function addLoggedInItems() {
    let user = await Users_API.GetLocalUser();

    if (user === null) {
        await logout();
        hidePosts();
        showError("Une erreur est survenu!", "Vous avez été déconnecté du service.");
        return;
    }

    if (user.isBlocked)
    {
        await logout();
        hidePosts();
        showError("Une erreur est survenu!", "Vous avez été déconnecté du service.");
        return;
    }

    let userInfo = $(`
        <div style="display: flex; height: 3em; align-items: center; gap: 0.5em;">
            <div style="flex: 3;">
                <div style="background-position: center; background-size: cover; background-image: url('${user.Avatar}'); height: 48px; width: 48px; border-radius: 2em; margin: auto;"></div>
            </div>
            <div style="flex: 7; font-weight: bold;">${user.Name}</div>
        </div>
    `);
    addDropdownElement(userInfo);

    addDropdownDivider();

    if (user.isAdmin)
    {
        let managerUsers = addDropdownItem("Gestion des usagers", "managerUsersCmd", "fa-solid fa-user-gear");
        managerUsers.on("click", function () {
            showAdminPanel();
        });
        addDropdownDivider();
    }

    let modifyUser = addDropdownItem("Modifier votre profil", "modifyUserCmd", "fa-solid fa-user-pen");
    modifyUser.on("click", showModifyUser);

    let logoutUser = addDropdownItem("Déconnexion", "logoutUserCmd", "fa-solid fa-right-from-bracket");
    logoutUser.on("click", logout);
}

/////////////////////// Posts content manipulation ///////////////////////////////////////////////////////

function linefeeds_to_Html_br(selector) {
    $.each($(selector), function () {
        let postText = $(this);
        var str = postText.html();
        var regex = /[\r\n]/g;
        postText.html(str.replace(regex, "<br>"));
    })
}

function highlight(text, elem) {
    text = text.trim();
    if (text.length >= minKeywordLenth) {
        var innerHTML = elem.innerHTML;
        let startIndex = 0;

        while (startIndex < innerHTML.length) {
            var normalizedHtml = innerHTML.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            var index = normalizedHtml.indexOf(text, startIndex);
            let highLightedText = "";
            if (index >= startIndex) {
                highLightedText = "<span class='highlight'>" + innerHTML.substring(index, index + text.length) + "</span>";
                innerHTML = innerHTML.substring(0, index) + highLightedText + innerHTML.substring(index + text.length);
                startIndex = index + highLightedText.length + 1;
            } else
                startIndex = innerHTML.length + 1;
        }
        elem.innerHTML = innerHTML;
    }
}

function highlightKeywords() {
    if (showKeywords) {
        let keywords = $("#searchKeys").val().split(' ');
        if (keywords.length > 0) {
            keywords.forEach(key => {
                let titles = document.getElementsByClassName('postTitle');
                Array.from(titles).forEach(title => {
                    highlight(key, title);
                })
                let texts = document.getElementsByClassName('postText');
                Array.from(texts).forEach(text => {
                    highlight(key, text);
                })
            })
        }
    }
}

//////////////////////// Forms rendering /////////////////////////////////////////////////////////////////

async function renderEditPostForm(id) {
    $('#commit').show();
    addWaitingGif();
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let Post = response.data;
        if (Post !== null)
            renderPostForm(Post);
        else
            showError("Post introuvable!");
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
}

async function renderDeletePostForm(id) {
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let post = response.data;
        if (post !== null) {
            let date = convertToFrenchDate(UTC_To_Local(post.Date));
            $("#form").append(`
                <div class="post" id="${post.Id}">
                <div class="postHeader">  ${post.Category} </div>
                <div class="postTitle ellipsis"> ${post.Title} </div>
                <img class="postImage" src='${post.Image}'/>
                <div class="postDate"> ${date} </div>
                <div class="postTextContainer showExtra">
                    <div class="postText">${post.Text}</div>
                </div>
            `);
            linefeeds_to_Html_br(".postText");
            // attach form buttons click event callback
            $('#commit').on("click", async function () {
                await Posts_API.Delete(post.Id);
                if (!Posts_API.error) {
                    await showPosts();
                } else {
                    console.log(Posts_API.currentHttpError)
                    showError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", async function () {
                await showPosts();
            });

        } else {
            showError("Post introuvable!");
        }
    } else
        showError(Posts_API.currentHttpError);
}

function newPost() {
    let Post = {};
    Post.Id = 0;
    Post.Title = "";
    Post.Text = "";
    Post.Image = "news-logo-upload.png";
    Post.Category = "";
    return Post;
}

async function renderPostForm(post = null) {
    let localUser = await Users_API.GetLocalUser();

    if (Users_API.error) {
        showError("Une erreur est survenue!");
        return;
    }

    let create = post == null;
    if (create) post = newPost();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
            <input type="hidden" name="CreatedBy" value="${localUser.Id}"/>
             <input type="hidden" name="Date" value="${post.Date}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Texte</label>
             <textarea class="form-control" 
                          name="Text" 
                          id="Text"
                          placeholder="Texte" 
                          rows="9"
                          required 
                          RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Image' 
                     imageSrc='${post.Image}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary displayNone">
        </form>
    `);
    if (create) $("#keepDateControl").hide();

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!

    $("#commit").click(function () {
        $("#commit").off();
        return $('#savePost').trigger("click");
    });
    $('#postForm').on("submit", async function (event) {
        event.preventDefault();
        let post = getFormData($("#postForm"));
        if (post.Category != selectedCategory)
            selectedCategory = "";
        if (create || !('keepDate' in post))
            post.Date = Local_to_UTC(Date.now());
        delete post.keepDate;
        post = await Posts_API.Save(post, create);
        if (!Posts_API.error) {
            await showPosts();
            postsPanel.scrollToElem(post.Id);
        } else
            showError("Une erreur est survenue! ", Posts_API.currentHttpError);
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}

function getFormData($form) {
    // prevent html injections
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    // grab data from all controls
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}

Init_UI();