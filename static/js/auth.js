/*
 * ============================================================
 * DIGSEARCH CLERK AUTHENTICATION
 * ============================================================
 */

window.DigSearchAuth = {

  isSignedIn: false,
  user: null,


  // ==========================================================
  // INITIALIZE
  // ==========================================================

  async init() {

    try {

      if (typeof Clerk === "undefined") {

        console.error(
          "Clerk is not loaded."
        );

        return;

      }

      /*
       * Initialize Clerk.
       */

      await Clerk.load({
        ui: {
          ClerkUI:
            window.__internal_ClerkUICtor
        }
      });


      console.log(
        "Clerk loaded successfully."
      );


      /*
       * Current authentication state.
       */

      this.isSignedIn =
        !!Clerk.isSignedIn;

      this.user =
        Clerk.user || null;


      /*
       * Update navbar.
       */

      this.updateNavigation();


      /*
       * Listen for authentication changes.
       */

      Clerk.addListener(
        ({ user }) => {

          this.isSignedIn =
            !!Clerk.isSignedIn;

          this.user =
            user || null;

          this.updateNavigation();

        }
      );


    } catch (error) {

      console.error(
        "Clerk initialization error:",
        error
      );

    }

  },


  // ==========================================================
  // LOGIN
  // ==========================================================

  async openSignIn() {

    try {

      if (typeof Clerk === "undefined") {

        console.error(
          "Clerk SDK is not loaded."
        );

        return false;

      }


      await Clerk.load({
        ui: {
          ClerkUI:
            window.__internal_ClerkUICtor
        }
      });


      /*
       * Open Clerk login modal.
       */

      Clerk.openSignIn();


      return true;


    } catch (error) {

      console.error(
        "Unable to open Clerk Sign In:",
        error
      );

      return false;

    }

  },


  // ==========================================================
  // SIGN UP
  // ==========================================================

  async openSignUp() {

    try {

      if (typeof Clerk === "undefined") {

        console.error(
          "Clerk SDK is not loaded."
        );

        return false;

      }


      await Clerk.load({
        ui: {
          ClerkUI:
            window.__internal_ClerkUICtor
        }
      });


      /*
       * Open Clerk signup modal.
       */

      Clerk.openSignUp();


      return true;


    } catch (error) {

      console.error(
        "Unable to open Clerk Sign Up:",
        error
      );

      return false;

    }

  },


  // ==========================================================
  // REQUIRE AUTH
  // ==========================================================

  async requireAuth() {

    try {

      /*
       * Make sure Clerk exists.
       */

      if (typeof Clerk === "undefined") {

        console.error(
          "Clerk SDK is not loaded."
        );

        return false;

      }


      await Clerk.load({
        ui: {
          ClerkUI:
            window.__internal_ClerkUICtor
        }
      });


      /*
       * Already authenticated.
       */

      if (Clerk.isSignedIn) {

        this.isSignedIn = true;
        this.user = Clerk.user;

        return true;

      }


      /*
       * Not authenticated.
       *
       * Open login.
       */

      Clerk.openSignIn();


      /*
       * IMPORTANT:
       *
       * We don't immediately return true here.
       * The user has to actually authenticate.
       */

      return await this.waitForAuthentication();


    } catch (error) {

      console.error(
        "Authentication error:",
        error
      );

      return false;

    }

  },


  // ==========================================================
  // WAIT FOR LOGIN
  // ==========================================================

  async waitForAuthentication() {

    /*
     * Wait until Clerk reports that the
     * user has actually signed in.
     */

    return new Promise(resolve => {

      let finished = false;


      const checkAuth = () => {

        if (finished) {
          return;
        }


        if (Clerk.isSignedIn) {

          finished = true;

          this.isSignedIn = true;

          this.user =
            Clerk.user || null;

          this.updateNavigation();

          resolve(true);

          return;

        }


        /*
         * Keep checking.
         */

        setTimeout(
          checkAuth,
          300
        );

      };


      checkAuth();


      /*
       * Safety timeout:
       *
       * Don't wait forever if user closes
       * the login window/modal.
       */

      setTimeout(() => {

        if (!finished) {

          finished = true;

          resolve(
            !!Clerk.isSignedIn
          );

        }

      }, 120000);

    });

  },


  // ==========================================================
  // GET TOKEN
  // ==========================================================

  async getToken() {

    try {

      if (typeof Clerk === "undefined") {

        return null;

      }


      await Clerk.load({
        ui: {
          ClerkUI:
            window.__internal_ClerkUICtor
        }
      });


      if (!Clerk.isSignedIn) {

        return null;

      }


      if (!Clerk.session) {

        console.error(
          "Clerk session not available."
        );

        return null;

      }


      const token =
        await Clerk.session.getToken();


      return token || null;


    } catch (error) {

      console.error(
        "Unable to get Clerk session token:",
        error
      );

      return null;

    }

  },


  // ==========================================================
  // SIGN OUT
  // ==========================================================

  async signOut() {

    try {

      if (typeof Clerk === "undefined") {
        return;
      }


      await Clerk.signOut();


      this.isSignedIn = false;
      this.user = null;


      this.updateNavigation();


      window.location.href = "/";


    } catch (error) {

      console.error(
        "Sign out failed:",
        error
      );

    }

  },


  // ==========================================================
  // NAVIGATION
  // ==========================================================

  updateNavigation() {

    const loginBtn =
      document.getElementById(
        "loginBtn"
      );

    const signupBtn =
      document.getElementById(
        "signupBtn"
      );


    if (
      !loginBtn ||
      !signupBtn
    ) {

      return;

    }


    /*
     * USER LOGGED IN
     */

    if (this.isSignedIn) {

      const firstName =
        this.user?.firstName;


      loginBtn.textContent =
        firstName
          ? `Hi, ${firstName}`
          : "Account";


      signupBtn.textContent =
        "Sign Out";


      loginBtn.onclick = () => {

        window.location.href =
          "/research";

      };


      signupBtn.onclick = () => {

        this.signOut();

      };


    }


    /*
     * USER LOGGED OUT
     */

    else {

      loginBtn.textContent =
        "Log In";

      signupBtn.textContent =
        "Get Started";


      loginBtn.onclick = () => {

        this.openSignIn();

      };


      signupBtn.onclick = () => {

        this.openSignUp();

      };

    }

  }

};


// ============================================================
// INITIALIZE
// ============================================================

window.addEventListener(
  "load",
  () => {

    window.DigSearchAuth.init();

  }
);