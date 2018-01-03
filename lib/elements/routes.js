module.exports = {
    "auth-login": {
        route: "/auth/login",
        module: "auth",
        controller: "index",
        action: "login"
    },
    "auth-signup": {
        route: "/auth/signup",
        module: "auth",
        controller: "index",
        action: "signup"
    },

    /*"auth-logout": {
        route: "/logout",
        module: "auth",
        controller: "index",
        action: "logout"
    },
    "auth-reset-password": {
        route: "/auth/reset-password",
        module: "auth",
        controller: "reset-password",
        action: "index",
        sitemap: {
            priority: 0.9,
            frequency: "daily"
        }
    },
    "auth-reset-password-confirm": {
        route: "/auth/reset-password/confirm",
        module: "auth",
        controller: "reset-password",
        action: "confirm"
    },
    "auth-reset-password-failed": {
        route: "/auth/reset-password/failed",
        module: "auth",
        controller: "reset-password",
        action: "failed"
    },
    "auth-reset-password-success": {
        route: "/auth/reset-password/success",
        module: "auth",
        controller: "reset-password",
        action: "success"
    }*/
};
