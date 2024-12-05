class Users_API {
    static Host_URL() { return "http://localhost:5000"; }

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

    static async EmailExists(email)
    {
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + "/accounts/exists?Email=" + email,
                type: "GET",
                success: (data) => { resolve(data); },
                error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    static async Register(data)
    {
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + "/accounts/register",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(data),
                success: (data) => { resolve(data); },
                error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    static async VerifyCode(id, code) {
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: `${this.Host_URL()}/accounts/verify?id=${id}&code=${code}`,
                type: "GET",
                success: (data) => { resolve(data); },
                error: (xhr) => { 
                    Users_API.setHttpErrorState(xhr); 
                    resolve(null); 
                }
            });
        });
    }
}