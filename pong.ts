// Main code for game Pong
// Code by : Chantelle Loh Yi Wei
// Student ID : 31171109 
// Mainly Inspired by Tim's Asteroid code https://stackblitz.com/edit/asteroids05?file=index.ts

//import the rxjs tools for observable use
import { interval, fromEvent, from, zip, Observable, range, timer } from 'rxjs'
import { map, scan, filter, merge, flatMap, take, concat, takeUntil, timestamp, subscribeOn, reduce, first } from 'rxjs/operators'

// create a class for Constants used throughout the code 
const
  Constants = new class {
    readonly CanvasSize = 600;
    readonly BallVelocityY = 2;
    
  }

//making use of a Vector class which consist of normal Vector operation but are pure functions as
// they create new instances of Vector everytime they are called 
// similar to map, filter, reduce etc 
// highly inspired by Tim's Asteroid code 
class Vec {
  constructor(public readonly x: number = 0, public readonly y: number = 0) { }
  add = (b: Vec) => new Vec(this.x + b.x, this.y + b.y);
  addY = (s: number) => new Vec(this.x, this.y + s);
  sub = (b: Vec) => this.add(b.scale(-1));
  // length which can be said as speed as well 
  len = () => Math.sqrt(this.x * this.x + this.y * this.y);
  scale = (s: number) => new Vec(this.x * s, this.y * s);
  scaleY = (s: number) => new Vec(this.x, this.y * s);
  scaleX = (s: number) => new Vec(this.x * s, this.y);
  angleVelocity = (s: number, a: number) => new Vec(a * this.len() * Math.cos(s), this.len() * Math.sin(s));
  static One = new Vec(1, 1);
  static Zero = new Vec();
}

// Inside this function you will use the classes and functions 
// from rx.js
// to add visuals to the svg element in pong.html, animate them, and make them interactive.
// Study and complete the tasks in observable exampels first to get ideas.
// Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/ 
// You will be marked on your functional programming style
// as well as the functionality that you implement.
// Document your code!
function pong() {

  class Move { constructor(public readonly distance: number) { } };
  class Mouse { constructor(public readonly y: number) { } };



  // type of Event for controlling player's paddle 
  type Event = 'keydown' | 'keyup' | "mousemove"
  type Key = 'ArrowUp' | 'ArrowDown'

  // Body for movable elements involved in the game: 
  // player, computer and ball
  // as player and computer are rect, while ball is circle, included both radius, height and width 
  // however for shapes that dont have either of it, that property is 0, eg. radius = 0 for rectangle  
  type Body = Readonly<{
    id: string,
    pos: Vec,
    vel: Vec
    radius: number,
    height: number,
    width: number
  }>

  // State which will keep track of each state's instances 
  // included the tracking of scores and also the outcome, is it victory or gameOver
  type State = Readonly<{
    player: Body,
    computer: Body,
    ball: Body,
    playerScore: number,
    computerScore: number
    gameOver: boolean
    victory: boolean

  }>

  function classicPong(ballVelocity: number, computerLevel: number) {
    // a function to create player's body
    function createPlayer(): Body {
      return {
        id: 'player',
        pos: new Vec(20, Constants.CanvasSize / 2),

        vel: Vec.Zero,
        radius: 0,
        height: 70,
        width: 10
      }
    }

    // a function to create computer's body
    function createComputer(): Body {
      return {
        id: 'comp',
        pos: new Vec(Constants.CanvasSize - 20, Constants.CanvasSize / 2),
        vel: Vec.Zero,
        radius: 0,
        height: 70,
        width: 10
      }
    }

    // a function to create ball with the given velocity 
    function createBall(x: number, y: number): Body {
      return {
        id: 'ball',
        pos: new Vec(Constants.CanvasSize / 2, Constants.CanvasSize / 2),

        vel: new Vec(x, y),
        radius: 5,
        height: 0,
        width: 0
      }
    }

    // initial State of the game 
    const initialState: State = {
      player: createPlayer(),
      computer: createComputer(),
      ball: createBall(ballVelocity, Constants.BallVelocityY),
      playerScore: 0,
      computerScore: 0,
      gameOver: false,
      victory: false

    }

    // for movements of the player's paddle 
    const observeKey = <T>(e: Event, k: Key, result: () => T) =>
      fromEvent<KeyboardEvent>(document, e)
        .pipe(
          filter(({ key }) => key === k),
          map(result)
        ),
      startgoUp = observeKey('keydown', 'ArrowDown', () => new Move(10)),
      startgoDown = observeKey('keydown', 'ArrowUp', () => new Move(-10)),
      observeMouse = fromEvent<MouseEvent>(document, "mousemove").pipe(
        map(({ clientY }) => ({ y: clientY })),
        map(({ y }) => new Mouse(y)))

    // for movement of the ball
    const moveBall = (o: Body) => <Body>{
      ...o,
      pos: new Vec(o.pos.x + o.vel.x, o.pos.y + o.vel.y)
    }




    // most game logic handled here: 
    // ball hit top and bottom wall 
    // ball hit paddle 
    // ball pass right left goals --> either side scores 
    // ball movement followed by computer and its level 
    
    const handleLogic = (s: State): State => {
      //ball and wall 
      // when ball hit either top or bottom of the canvas, it will bounce back
      const collidedBallAndWall = (s: State) =>
        ((s.ball.pos.y + s.ball.radius) > Constants.CanvasSize || (s.ball.pos.y - s.ball.radius) < 0) ? s.ball.vel.scaleY(-1) : collideBallAndPlayer(s)

      
      //ball and paddle ( player and comp)
      // left is player paddle, right is AI 
      
      const collideBallAndPlayer = (s: State) => {
        const paddle = (s.ball.pos.x < Constants.CanvasSize / 2) ? s.player : s.computer,
              currentBall = s.ball,
              direction = (currentBall.pos.x < Constants.CanvasSize / 2) ? 1 : -1,
              collidePoint = (currentBall.pos.y - (paddle.pos.y + paddle.height / 2)) / (paddle.height / 2),
              angleRad = collidePoint * (Math.PI / 4);

        //right of ball > left of paddle 
        return ((currentBall.pos.x + currentBall.radius) > (paddle.pos.x) &&
                  //left of ball < right of paddle
                (currentBall.pos.x - currentBall.radius) < (paddle.pos.x + paddle.width) &&
                  //bottom of ball > top of paddle
                (currentBall.pos.y + currentBall.radius) > (paddle.pos.y) &&
                  // top of ball < bottom of paddle
                (currentBall.pos.y - currentBall.radius) < (paddle.pos.y + paddle.height)) ?
                (currentBall.vel.angleVelocity(angleRad, direction)) : currentBall.vel
      }
      //let computer hit the ball ( movement of computer)
      const computerMove = (s: State) => {
        return (s.ball.pos.y - (s.computer.pos.y + s.computer.height / 2)) * computerLevel
      }
      // when ball goes left, computer scores 
      const compScore = (s: State) => {
        return (s.ball.pos.x - s.ball.radius < 0) ? s.computerScore + 1 : s.computerScore
      }
      // when ball goes right, player scores
      const playScore = (s: State) => {
        return ((s.ball.pos.x + s.ball.radius > Constants.CanvasSize) ? s.playerScore + 1 : s.playerScore)
      }

      //outcome of the game
      const winLiao = (s.playerScore == 7 && s.computerScore < 7)
      const loseLiao = (s.computerScore == 7 && s.playerScore < 7)

      return <State>{
        ...s,
        computer: { ...s.computer, pos: s.computer.pos.addY(computerMove(s)) },
        ball: { ...s.ball, vel: collidedBallAndWall(s) },
        computerScore: compScore(s),
        playerScore: playScore(s),
        gameOver: loseLiao,
        victory: winLiao
      }
    }

    // restrict the ball from flying too far, must reset it to the middle 
    // restrict both paddles from going out of canvas
    const restrict = (s: State) => {
      //after Goal reset ball
      const resetBall = (s: State) => {
        return (s.ball.pos.x - s.ball.radius < 0 || s.ball.pos.x + s.ball.radius > Constants.CanvasSize) ?
          (createBall(-1 * ballVelocity, -1* s.ball.vel.y)) : s.ball
      }
      // maybe try create ball in better speed, followed by the parameters

      //Paddle and the wall
      //player
      const restrictPlayer = (s: State) => {
        if ((s.player.pos.y + s.player.height) > Constants.CanvasSize) {
          return Constants.CanvasSize - s.player.height;
        } else if ((s.player.pos.y) < 0) {
          return 0;
        } else {
          return s.player.pos.y;
        }
      }
      //computer
      const restrictComp = (s: State) => {
        if ((s.computer.pos.y + s.computer.height) >= Constants.CanvasSize) {
          return 530;
        } else if ((s.computer.pos.y) <= 0) {
          return 1;
        } else {
          return s.computer.pos.y;
        }
      }
      return <State>{
        ...s,
        ball: resetBall(s),
        player: { ...s.player, pos: new Vec(s.player.pos.x, restrictPlayer(s)) },
        computer: { ...s.computer, pos: new Vec(s.computer.pos.x, restrictComp(s)) }
      }
    }




    //reduce all events and the resulting state into one function 
    const reduceState = (s: State, e: Move | Mouse): State =>
      e instanceof Move ? {
        ...s,
        player: { ...s.player, pos: new Vec(s.player.pos.x, s.player.pos.y + e.distance) }
      } :
        e instanceof Mouse ?
          {
            ...s,
            player: { ...s.player, pos: new Vec(s.player.pos.x, e.y - (s.player.height / 2) - 111) }
          }
          : (restrict(handleLogic({
            ...s,
            ball: moveBall(s.ball),
          })))

    // main subscription of the game 
    const subscription = interval(5).pipe(
      merge(startgoDown, startgoUp, observeMouse), scan(reduceState, initialState))
      .subscribe(updateView)


    // update view --> here we update the state of each svg element (Body)
    function updateView(state: State) {
      const svg = document.getElementById("canvas")!;
      const player = document.getElementById("player")!;
      const ball = document.getElementById("ball")!;
      const compuScore = document.getElementById("compscore")!;
      const playerScore = document.getElementById("playerscore")!;
      const computer = document.getElementById("comp")!;
      

      // setting all attribute needed in subscribe
      player.setAttribute('y', String(Number(state.player.pos.y)))
      computer.setAttribute('y', String(Number(state.computer.pos.y)))
      ball.setAttribute('cx', String(Number(state.ball.pos.x)))
      ball.setAttribute('cy', String(Number(state.ball.pos.y)))
      compuScore.textContent = String(Number(state.computerScore))
      playerScore.textContent = String(Number(state.playerScore))


      if (state.gameOver) {       
        const v = document.createElementNS(svg.namespaceURI, "text")!;
        const refresh = document.createElementNS(svg.namespaceURI, "text")!;
        //setting attribute manually since we cant use any as a type ( object can be any )
        v.setAttribute('x', String(Number(Constants.CanvasSize / 4)))
        v.setAttribute('y', String(Number(Constants.CanvasSize / 2)))
        v.setAttribute('class', "gameover")
        v.textContent = "Computer wins!";

        refresh.setAttribute('x', String(Number(Constants.CanvasSize / 2 - 150)))
        refresh.setAttribute('y', String(Number(Constants.CanvasSize / 2 + 50)))
        refresh.setAttribute('class', "refresh")
        refresh.textContent = "Page will reset in 5 seconds"

        svg.appendChild(v);
        svg.appendChild(refresh);
        interval(5000).pipe(first()).subscribe(() => window.location.reload());
        // setTimeout("location.reload(true);",5000)
        subscription.unsubscribe()
       
       
      }
      else if (state.victory) {

        const v = document.createElementNS(svg.namespaceURI, "text")!;
        const refresh = document.createElementNS(svg.namespaceURI, "text")!;

        v.setAttribute('x', String(Number(Constants.CanvasSize / 4)))
        v.setAttribute('y', String(Number(Constants.CanvasSize / 2)))
        v.setAttribute('class', "victory")
        v.textContent = "Player wins!";

        refresh.setAttribute('x', String(Number(Constants.CanvasSize / 2 - 150)))
        refresh.setAttribute('y', String(Number(Constants.CanvasSize / 2 + 50)))
        refresh.setAttribute('class', "refresh")
        refresh.textContent = "Game will reset in 5 seconds"

        svg.appendChild(v);
        svg.appendChild(refresh);

        interval(5000).pipe(first()).subscribe(() => window.location.reload());
        // setTimeout("location.reload(true);",5000)
        subscription.unsubscribe()

      }

    }
    
    return ballVelocity;

  }


  //these codes here are for better visual separation of level of the game, an extension of the game 
  // introducing different level with buttons
  

  const clickObservable = (id: string) => {
    const svg = document.getElementById(id)!;
    return fromEvent<MouseEvent>(svg, "click");
  }

  clickObservable("level1").subscribe(() => { classicPong(1, 0.03) })
  clickObservable("level2").subscribe(() => { classicPong(2.5, 0.045) })
  clickObservable("level3").subscribe(() => { classicPong(4, 0.05) })


}


// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != 'undefined')
  window.onload = () => {
    pong();
  }



