
import base64


import os
import traceback
import requests
import jwt

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

CLERK_PUBLISHABLE_KEY = os.getenv("CLERK_PUBLISHABLE_KEY")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")


if not CLERK_PUBLISHABLE_KEY:
    raise RuntimeError(
        "CLERK_PUBLISHABLE_KEY is missing from .env"
    )

if not CLERK_SECRET_KEY:
    raise RuntimeError(
        "CLERK_SECRET_KEY is missing from .env"
    )


# ============================================================
# FLASK
# ============================================================

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)

CORS(app)


# ============================================================
# CLERK DOMAIN
# ============================================================

def get_clerk_domain():

    try:

        encoded = CLERK_PUBLISHABLE_KEY.split("_", 2)[2]

        decoded = base64.b64decode(
            encoded + "==="
        ).decode("utf-8")

        return decoded.rstrip("$")

    except Exception as error:

        print("Could not determine Clerk domain:", error)

        return None


# ============================================================
# CLERK TOKEN VERIFICATION
# ============================================================

def verify_clerk_token():
    authorization = request.headers.get("Authorization")

    if not authorization:
        print("❌ Authorization header missing")
        return None

    if not authorization.startswith("Bearer "):
        print("❌ Invalid Authorization header")
        return None

    token = authorization.split(" ", 1)[1].strip()

    if not token:
        print("❌ Empty Clerk token")
        return None

    try:

        # ----------------------------------------------------
        # Read JWT header
        # ----------------------------------------------------

        header = jwt.get_unverified_header(token)

        kid = header.get("kid")

        if not kid:
            print("❌ JWT kid missing")
            return None


        # ----------------------------------------------------
        # Get Clerk Frontend API domain
        # ----------------------------------------------------

        publishable_key = CLERK_PUBLISHABLE_KEY

        if not publishable_key:
            print("❌ CLERK_PUBLISHABLE_KEY missing")
            return None


        # Clerk publishable key looks approximately like:
        #
        # pk_test_<encoded-domain>
        #
        # Decode the domain portion.

        import base64

        encoded = publishable_key.split("_", 2)[2]

        clerk_domain = (
            base64.b64decode(
                encoded + "==="
            )
            .decode("utf-8")
            .rstrip("$")
        )


        # ----------------------------------------------------
        # Clerk JWKS
        # ----------------------------------------------------

        jwks_url = (
            f"https://{clerk_domain}/.well-known/jwks.json"
        )

        print(
            "Fetching Clerk JWKS from:",
            jwks_url
        )

        response = requests.get(
            jwks_url,
            timeout=10
        )

        response.raise_for_status()

        jwks = response.json()


        # ----------------------------------------------------
        # Find signing key
        # ----------------------------------------------------

        public_key = None

        for key in jwks.get("keys", []):

            if key.get("kid") == kid:

                public_key = (
                    jwt.algorithms.RSAAlgorithm.from_jwk(
                        key
                    )
                )

                break


        if public_key is None:

            print(
                f"❌ No matching Clerk key found for kid: {kid}"
            )

            return None


        # ----------------------------------------------------
        # Verify JWT
        # ----------------------------------------------------

        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={
                "verify_aud": False
            }
        )


        print(
            "✅ Clerk token verified"
        )

        print(
            "User ID:",
            payload.get("sub")
        )

        return payload


    except jwt.ExpiredSignatureError:

        print(
            "❌ Clerk token expired"
        )

        return None


    except jwt.InvalidTokenError as error:

        print(
            "❌ Invalid Clerk token:",
            error
        )

        return None


    except Exception as error:

        print(
            "❌ Clerk authentication error:",
            error
        )

        traceback.print_exc()



# ============================================================
# HOME
# ============================================================

@app.route("/")
def home():

    return render_template(
        "index.html",
        clerk_publishable_key=CLERK_PUBLISHABLE_KEY
    )


# ============================================================
# RESEARCH PAGE
# ============================================================

@app.route("/research")
def research_page():

    return render_template(
        "research.html",
        clerk_publishable_key=CLERK_PUBLISHABLE_KEY
    )


# ============================================================
# ABOUT
# ============================================================

@app.route("/about")
def about_page():

    return render_template(
        "about.html",
        clerk_publishable_key=CLERK_PUBLISHABLE_KEY
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify({
        "success": True,
        "message": "DigSearch API is running"
    })


@app.route("/health", methods=["GET"])
def health():
    return {"status": "healthy"}, 200



# ============================================================
# TEST
# ============================================================

@app.route("/api/test", methods=["GET"])
def test():

    return jsonify({
        "success": True,
        "message": "DigSearch backend connection is working."
    })


# ============================================================
# RESEARCH API
# ============================================================

@app.route("/api/research", methods=["POST"])
def research_api():

    # ========================================================
    # 1. VERIFY CLERK AUTHENTICATION
    # ========================================================

    user = verify_clerk_token()

    if user is None:

        return jsonify({
            "success": False,
            "error": "Authentication required. Please login."
        }), 401


    # ========================================================
    # 2. GET USER ID
    # ========================================================

    user_id = user.get("sub")

    print(
        f"\nAuthenticated user: {user_id}"
    )


    try:

        # ====================================================
        # 3. REQUEST BODY
        # ====================================================

        data = request.get_json(silent=True)

        if not data:

            return jsonify({
                "success": False,
                "error": "Request body is missing."
            }), 400


        # ====================================================
        # 4. QUERY
        # ====================================================

        query = str(
            data.get("query", "")
        ).strip()


        if not query:

            return jsonify({
                "success": False,
                "error": "Research query cannot be empty."
            }), 400


        print(
            f"\nResearch query: {query}"
        )


        # ====================================================
        # 5. CONNECT TO YOUR EXISTING PIPELINE
        # ====================================================

        from pipeline import run_research_pipeline


        result = run_research_pipeline(
            query
        )


        # ====================================================
        # 6. RETURN RESULT
        # ====================================================

        return jsonify({

            "success": True,

            "query": query,

            "user_id": user_id,

            "result": result

        }), 200


    except Exception as error:

        print(
            "\n=========================================="
        )

        print(
            "DIGSEARCH RESEARCH ERROR"
        )

        print(
            "=========================================="
        )

        traceback.print_exc()

        print(
            "=========================================="
        )


        return jsonify({

            "success": False,

            "error": str(error)

        }), 500


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({
        "success": False,
        "error": "Endpoint not found."
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):

    return jsonify({
        "success": False,
        "error": "HTTP method not allowed."
    }), 405


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("              DIGSEARCH SERVER")
    print("=" * 60)
    print("Home:     http://127.0.0.1:5000/")
    print("Research: http://127.0.0.1:5000/research")
    print("API:      http://127.0.0.1:5000/api/research")
    print("=" * 60)
    print()

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False
    )
