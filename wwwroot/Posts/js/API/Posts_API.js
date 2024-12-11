class Posts_API {
    static Host_URL() {
        return "http://localhost:5000";
    }

    static API_URL() {
        return this.Host_URL() + "/api/posts"
    };

    static initHttpState() {
        this.currentHttpError = "";
        this.currentStatus = 0;
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

    static async HEAD() {
        Posts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL(),
                type: 'HEAD',
                contentType: 'text/plain',
                complete: data => {
                    resolve(data.getResponseHeader('ETag'));
                },
                error: (xhr) => {
                    Posts_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    static async Get(id = null) {
        Posts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + (id != null ? "/" + id : ""),
                complete: data => {
                    resolve({ETag: data.getResponseHeader('ETag'), data: data.responseJSON});
                },
                error: (xhr) => {
                    Posts_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    static async GetQuery(queryString = "") {
        Posts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + queryString,
                complete: data => {
                    resolve({ETag: data.getResponseHeader('ETag'), data: data.responseJSON});
                },
                error: (xhr) => {
                    Posts_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    static async Save(data, create = true) {
        Posts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: create ? this.API_URL() : this.API_URL() + "/" + data.Id,
                headers: { Authorization: `Bearer ${Users_API.GetToken()}` },
                type: create ? "POST" : "PUT",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Posts_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    static async Delete(id) {
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + "/" + id,
                type: "DELETE",
                complete: () => {
                    Posts_API.initHttpState();
                    resolve(true);
                },
                error: (xhr) => {
                    Posts_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }

    static ToggleLike(idPost) {
        Posts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + `/posts/togglelike?id=${idPost}`,
                headers: {
                    Authorization: `Bearer ${Users_API.GetToken()}`,
                },
                type: "GET",
                complete: () => {
                    resolve(true);
                },
                error: (xhr) => {
                    Posts_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }
}