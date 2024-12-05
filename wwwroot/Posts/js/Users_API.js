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
}