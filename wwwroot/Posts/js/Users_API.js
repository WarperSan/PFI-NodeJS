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
    static Logout(id) {
        let token = sessionStorage.getItem(LOCAL_USER_TOKEN_KEY);
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + `/accounts/logout?id=${id}&token=${token}`,
                type: "GET",
                success: (data) => {
                    sessionStorage.removeItem(LOCAL_USER_TOKEN_KEY);
                    resolve(data);
                },
                error: (xhr) => {
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

    /** Sets the token of the local user to the given token */
    static SetToken(token) {
        sessionStorage.setItem(LOCAL_USER_TOKEN_KEY, token);
    }

    /** Checks if the local user is logged in */
    static IsUserLoggedIn() {
        return sessionStorage.getItem(LOCAL_USER_TOKEN_KEY) !== null;
    }
}