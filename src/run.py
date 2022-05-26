import os

import flask
from flask import Flask, send_from_directory
import compile_spheres


def main() -> Flask:
    app = Flask(__name__, static_folder="static/")

    @app.route("/")
    def index():
        return flask.render_template("index.html.jinja2")

    @app.route("/spheres/<sphere>")
    def sphere(sphere: str):
        return flask.render_template("sphere.html.jinja2", filename=sphere)

    @app.route("/favicon.ico")
    def favicon():
        return send_from_directory(
            os.path.join(app.root_path, "static"), "favicon.ico", mimetype="image/vnd.microsoft.icon"
        )

    return app


if __name__ == "__main__":
    compile_spheres.main()
    main().run(host="0.0.0.0", port=80)
