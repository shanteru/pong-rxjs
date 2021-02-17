"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
// create global constants
var Constants = new /** @class */ (function () {
    function class_1() {
        this.CanvasSize = 600;
        this.BallVelocityX = 5;
        this.BallVelocityY = 5;
    }
    return class_1;
}());
function pong() {
    // Inside this function you will use the classes and functions 
    // from rx.js
    // to add visuals to the svg element in pong.html, animate them, and make them interactive.
    // Study and complete the tasks in observable exampels first to get ideas.
    // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/ 
    // You will be marked on your functional programming style
    // as well as the functionality that you implement.
    // Document your code!
    var Vec = /** @class */ (function () {
        function Vec(x, y) {
            var _this = this;
            if (x === void 0) { x = 0; }
            if (y === void 0) { y = 0; }
            this.x = x;
            this.y = y;
            this.add = function (b) { return new Vec(_this.x + b.x, _this.y + b.y); };
            this.sub = function (b) { return _this.add(b.scale(-1)); };
            this.len = function () { return Math.sqrt(_this.x * _this.x + _this.y * _this.y); };
            this.scale = function (s) { return new Vec(_this.x * s, _this.y * s); };
            this.scaleY = function (s) { return new Vec(_this.x, _this.y * s); };
            this.scaleX = function (s) { return new Vec(_this.x * s, _this.y); };
        }
        Vec.Zero = new Vec();
        return Vec;
    }());
    function createPlayer() {
        return {
            id: 'player',
            pos: new Vec(20, Constants.CanvasSize / 2),
            vel: Vec.Zero,
            radius: 10
        };
    }
    function createComputer() {
        return {
            id: 'comp',
            pos: new Vec(Constants.CanvasSize - 20, Constants.CanvasSize / 2),
            vel: Vec.Zero,
            radius: 10
        };
    }
    function createBall(x, y) {
        return {
            id: 'ball',
            pos: new Vec(Constants.CanvasSize / 2, Constants.CanvasSize / 2),
            vel: new Vec(x, y),
            radius: 5
        };
    }
    var initialState = {
        player: createPlayer(),
        computer: createComputer(),
        ball: createBall(Constants.BallVelocityX, Constants.BallVelocityY),
        playerScore: 0,
        computerScore: 0,
        gameOver: false,
        velocityCount: 0
    };
    var Move = /** @class */ (function () {
        function Move(distance) {
            this.distance = distance;
        }
        return Move;
    }());
    var observeKey = function (e, k, result) {
        return rxjs_1.fromEvent(document, e)
            .pipe(operators_1.filter(function (_a) {
            var key = _a.key;
            return key === k;
        }), operators_1.map(result));
    }, startgoUp = observeKey('keydown', 'ArrowDown', function () { return new Move(-10); }), startgoDown = observeKey('keydown', 'ArrowUp', function () { return new Move(10); }), stopgoDown = observeKey('keyup', 'ArrowDown', function () { return new Move(0); }), stopgoUp = observeKey('keyup', 'ArrowUp', function () { return new Move(0); });
    var moveBall = function (o) { return (__assign(__assign({}, o), { pos: new Vec(o.pos.x + o.vel.x, o.pos.y + o.vel.y) })); };
    var Bounce = /** @class */ (function () {
        function Bounce(x, y) {
            this.x = x;
            this.y = y;
        }
        return Bounce;
    }());
    var handleCollision = function (s) {
        //ball and wall 
        // when ball hit either top or bottom of the canvas, it will bounce back
        var collidedBallAndWall = function (s) {
            return ((s.ball.pos.y + s.ball.radius) > Constants.CanvasSize || (s.ball.pos.y - s.ball.radius) < 0) ? s.ball.vel.scaleY(-1) : s.ball.vel;
        };
        console.log(String(s.ball.vel));
        //ball and paddle ( player and comp)
        var bodiesCollided = function (a, b) { return a.pos.sub(b.pos).len() < a.radius + b.radius; }, paddleCollided = bodiesCollided(s.player, s.ball);
        return __assign(__assign({}, s), { ball: __assign(__assign({}, s.ball), { vel: collidedBallAndWall(s) }) });
    };
    //   const scoreGoal = (s:State)=>{
    //     const 
    //     playerWinGoal = ((s.ball.pos.x+s.ball.radius)> Constants.CanvasSize)
    // const compWinGoal = (s.ball.pos.x-s.ball.radius) < 0
    //   }
    var reduceState = function (s, e) {
        return e instanceof Move ? __assign(__assign({}, s), { player: __assign(__assign({}, s.player), { pos: new Vec(s.player.pos.x, s.player.pos.y + e.distance) }) }) : handleCollision(__assign(__assign({}, s), { ball: moveBall(s.ball) }));
    };
    var subscription = rxjs_1.interval(50).pipe(operators_1.merge(startgoDown, startgoUp, stopgoDown, stopgoUp), operators_1.scan(reduceState, initialState))
        .subscribe(updateView);
    function updateView(state) {
        var svg = document.getElementById("canvas");
        var player = document.getElementById("player");
        var ball = document.getElementById("ball");
        player.setAttribute('y', String(Number(state.player.pos.y)));
        ball.setAttribute('cx', String(Number(state.ball.pos.x)));
        ball.setAttribute('cy', String(Number(state.ball.pos.y)));
        console.log(String(state.ball.vel));
        var attr = function (e, o) { for (var k in o)
            e.setAttribute(k, String(o[k])); };
        if (state.gameOver) {
            subscription.unsubscribe();
            var v = document.createElementNS(svg.namespaceURI, "text");
            attr(v, { x: Constants.CanvasSize / 6, y: Constants.CanvasSize / 2, "class": "gameover" });
            v.textContent = "Game Over";
            svg.appendChild(v);
        }
    }
    function mousePosObservable() {
        var pos = document.getElementById("pos"), o = rxjs_1.fromEvent(document, "mousemove").
            pipe(operators_1.map(function (_a) {
            var clientX = _a.clientX, clientY = _a.clientY;
            return ({ x: clientX, y: clientY });
        }));
        o.pipe(operators_1.map(function (_a) {
            var x = _a.x, y = _a.y;
            return x + "," + y;
        }))
            .subscribe(function (s) { return pos.innerHTML = s; });
        o.pipe(operators_1.filter(function (_a) {
            var x = _a.x;
            return x > 400;
        }))
            .subscribe(function (_) { return pos.classList.add('highlight'); });
        o.pipe(operators_1.filter(function (_a) {
            var x = _a.x;
            return x <= 400;
        }))
            .subscribe(function (_) { return pos.classList.remove('highlight'); });
    }
    mousePosObservable();
}
// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != 'undefined')
    window.onload = function () {
        pong();
    };
