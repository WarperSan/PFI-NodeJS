const LOCAL_USER_TOKEN_KEY = "localUserToken";

class Users_API {
    static Host_URL() {
        return "http://localhost:5000";
    }

    static initHttpState() {
        this.currentHttpError = "";
        this.error = false;
    }

    static setHttpErrorState(xhr) {
        if (xhr.responseJSON)
            this.currentHttpError = xhr.responseJSON.error_description;
        else
            this.currentHttpError = xhr.statusText == 'error' ? "Service introuvable" : xhr.statusText;
        this.currentStatus = xhr.status;
        this.error = true;
    }

    /** Checks if the given email already exists */
    static EmailExists(email) {
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + "/accounts/exists?Email=" + email,
                type: "GET",
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    /** Registers a new user from the given data */
    static Register(data) {
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + "/accounts/register",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(data),
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    /** Logs in using the given credentials */
    static Login(credentials) {
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + "/token",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(credentials),
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    /** Logs out the user of the given id */
    static Logout() {
        Users_API.initHttpState();
        return new Promise(resolve => {
            if (!this.IsUserLoggedIn())
            {
                resolve(false);
                return;
            }

            $.ajax({
                url: this.Host_URL() + `/accounts/logout`,
                headers: { Authorization: `Bearer ${this.GetToken()}` },
                type: "GET",
                success: (data) => {
                    sessionStorage.removeItem(LOCAL_USER_TOKEN_KEY);
                    resolve(data);
                },
                error: (xhr) => {
                    sessionStorage.removeItem(LOCAL_USER_TOKEN_KEY);
                    Users_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    /** Verifies the user creation of the given ID with the given code */
    static Verify(id, code) {
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + `/accounts/verify?id=${id}&code=${code}`,
                type: "GET",
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    static GetToken() {
        return sessionStorage.getItem(LOCAL_USER_TOKEN_KEY);
    }

    /** Sets the token of the local user to the given token */
    static SetToken(token) {
        sessionStorage.setItem(LOCAL_USER_TOKEN_KEY, token);
    }

    /** Checks if the local user is logged in */
    static IsUserLoggedIn() {
        let token = this.GetToken();
        return token !== null && token !== "undefined";
    }

    /** Fetches the local user */
    static GetLocalUser() {
        Users_API.initHttpState();

        return new Promise(resolve => {

            // If not logged in
            if (!this.IsUserLoggedIn())
            {
                resolve(null);
                return;
            }

            let token = this.GetToken();

            $.ajax({
                url: this.Host_URL() + `/accounts/fromToken?token=${token}`,
                type: "GET",
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    /** Modifies the local user with the given data */
    static Modify(newData) {
        Users_API.initHttpState();

        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + `/accounts/modify`,
                headers: { Authorization: `Bearer ${this.GetToken()}` },
                type: "PUT",
                contentType: "application/json",
                data: JSON.stringify(newData),
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    /** Deletes the user with the given id */
    static Delete(id) {
        Users_API.initHttpState();

        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + `/accounts/remove/${id}`,
                headers: { Authorization: `Bearer ${this.GetToken()}` },
                type: "GET",
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    /** Fetches all the users */
    static GetAllUsers() {
        Users_API.initHttpState();

        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + `/accounts`,
                headers: { Authorization: `Bearer ${this.GetToken()}` },
                type: "GET",
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    /** Promotes the user of the given ID */
    static PromoteUser(id) {
        Users_API.initHttpState();

        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + `/accounts/promote`,
                headers: { Authorization: `Bearer ${this.GetToken()}` },
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({ "Id": id }),
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    /** Blocks the user of the given ID */
    static BlockUser(id) {
        Users_API.initHttpState();

        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + `/accounts/block`,
                headers: { Authorization: `Bearer ${this.GetToken()}` },
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({ "Id": id }),
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }
}