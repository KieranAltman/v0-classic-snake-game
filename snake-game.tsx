"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Play, Pause, RotateCcw, Trophy } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HelpCircle } from "lucide-react"

const GRID_SIZE = 20
const INITIAL_SNAKE = [{ x: 10, y: 10 }]
const INITIAL_DIRECTION = { x: 1, y: 0 }
const INITIAL_FOOD = { x: 15, y: 15 }

type Position = { x: number; y: number }
type Direction = { x: number; y: number }
type GameState = "idle" | "playing" | "paused" | "gameOver"

export default function SnakeGame() {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE)
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION)
  const [food, setFood] = useState<Position>(INITIAL_FOOD)
  const [score, setScore] = useState(0)
  const [gameState, setGameState] = useState<GameState>("idle")
  const [speed, setSpeed] = useState(200)
  const [wallMode, setWallMode] = useState(false) // false: 撞墙死亡, true: 穿墙模式
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== "undefined") {
      return Number.parseInt(localStorage.getItem("snakeHighScore") || "0")
    }
    return 0
  })

  // 生成随机食物位置
  const generateFood = useCallback((currentSnake: Position[]) => {
    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      }
    } while (currentSnake.some((segment) => segment.x === newFood.x && segment.y === newFood.y))
    return newFood
  }, [])

  // 检查碰撞
  const checkCollision = useCallback(
    (head: Position, body: Position[]) => {
      // 检查是否撞到自己
      if (body.some((segment) => segment.x === head.x && segment.y === head.y)) {
        return true
      }

      // 检查边界碰撞（非穿墙模式）
      if (!wallMode) {
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          return true
        }
      }

      return false
    },
    [wallMode],
  )

  // 处理穿墙
  const wrapPosition = useCallback((pos: Position): Position => {
    return {
      x: ((pos.x % GRID_SIZE) + GRID_SIZE) % GRID_SIZE,
      y: ((pos.y % GRID_SIZE) + GRID_SIZE) % GRID_SIZE,
    }
  }, [])

  // 游戏循环
  const gameLoop = useCallback(() => {
    if (gameState !== "playing") return

    setSnake((currentSnake) => {
      const newSnake = [...currentSnake]
      const head = { ...newSnake[0] }

      // 移动蛇头
      head.x += direction.x
      head.y += direction.y

      // 穿墙处理
      if (wallMode) {
        head.x = ((head.x % GRID_SIZE) + GRID_SIZE) % GRID_SIZE
        head.y = ((head.y % GRID_SIZE) + GRID_SIZE) % GRID_SIZE
      }

      // 检查碰撞
      if (checkCollision(head, newSnake)) {
        setGameState("gameOver")
        if (score > highScore) {
          setHighScore(score)
          localStorage.setItem("snakeHighScore", score.toString())
        }
        return currentSnake
      }

      newSnake.unshift(head)

      // 检查是否吃到食物
      if (head.x === food.x && head.y === food.y) {
        setScore((prev) => prev + 10)
        setFood(generateFood(newSnake))
        // 随着得分增加，速度逐渐提升
        setSpeed((prev) => Math.max(80, prev - 2))
      } else {
        newSnake.pop()
      }

      return newSnake
    })
  }, [gameState, direction, food, checkCollision, generateFood, score, highScore, wallMode])

  // 键盘控制
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (gameState !== "playing") return

      const keyMap: { [key: string]: Direction } = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
      }

      const newDirection = keyMap[e.key]
      if (newDirection) {
        // 防止掉头
        setDirection((currentDirection) => {
          if (newDirection.x === -currentDirection.x && newDirection.y === -currentDirection.y) {
            return currentDirection
          }
          return newDirection
        })
      }

      // 暂停/继续
      if (e.key === " ") {
        e.preventDefault()
        setGameState((prev) => (prev === "playing" ? "paused" : "playing"))
      }
    },
    [gameState],
  )

  // 游戏控制
  const startGame = () => {
    setSnake(INITIAL_SNAKE)
    setDirection(INITIAL_DIRECTION)
    setFood(generateFood(INITIAL_SNAKE))
    setScore(0)
    setSpeed(200)
    setGameState("playing")
  }

  const pauseGame = () => {
    setGameState((prev) => (prev === "playing" ? "paused" : "playing"))
  }

  const resetGame = () => {
    setSnake(INITIAL_SNAKE)
    setDirection(INITIAL_DIRECTION)
    setFood(INITIAL_FOOD)
    setScore(0)
    setSpeed(200)
    setGameState("idle")
  }

  // 设置游戏循环
  useEffect(() => {
    const gameInterval = setInterval(gameLoop, speed)
    return () => clearInterval(gameInterval)
  }, [gameLoop, speed])

  // 设置键盘监听
  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [handleKeyPress])

  // 渲染网格
  const renderGrid = () => {
    const grid = []
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        let cellType = "empty"

        // 检查是否是蛇头
        if (snake[0] && snake[0].x === x && snake[0].y === y) {
          cellType = "head"
        }
        // 检查是否是蛇身
        else if (snake.slice(1).some((segment) => segment.x === x && segment.y === y)) {
          cellType = "body"
        }
        // 检查是否是食物
        else if (food.x === x && food.y === y) {
          cellType = "food"
        }

        if (cellType === "food") {
          // 双层果实结构
          grid.push(
            <div
              key={`${x}-${y}`}
              className="w-4 h-4 border border-gray-200 bg-gray-50 relative flex items-center justify-center"
            >
              {/* 外层动画层 */}
              <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-75" />
              {/* 内层果实主体 */}
              <div className="w-2.5 h-2.5 bg-orange-500 rounded-full relative z-10" />
            </div>,
          )
        } else {
          grid.push(
            <div
              key={`${x}-${y}`}
              className={`w-4 h-4 border border-gray-200 ${
                cellType === "head" ? "bg-green-600" : cellType === "body" ? "bg-green-400" : "bg-gray-50"
              }`}
            />,
          )
        }
      }
    }
    return grid
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-mono">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center justify-center gap-2">
            <CardTitle className="text-2xl font-bold">Snake Game</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1">
                  <HelpCircle className="w-5 h-5 text-gray-500" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Game Rules</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-semibold mb-1">Controls:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Use arrow keys or WASD to control snake movement</li>
                      <li>• Spacebar to pause/resume game</li>
                      <li>• Cannot reverse direction (no U-turns)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Gameplay:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Eat orange food to score 10 points and grow longer</li>
                      <li>• Game speed increases as your score grows</li>
                      <li>• Avoid hitting your own body</li>
                      <li>• Wall Pass Mode allows moving through boundaries</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Scoring:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Each food item = 10 points</li>
                      <li>• High score is automatically saved</li>
                      <li>• Try to beat your personal best!</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <Badge variant="secondary">Score: {score}</Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                High Score: {highScore}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="wall-mode"
                checked={wallMode}
                onCheckedChange={setWallMode}
                disabled={gameState === "playing"}
              />
              <Label htmlFor="wall-mode">Wall Pass Mode</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            {/* 游戏区域 */}
            <div
              className="grid gap-0 border-2 border-gray-400 bg-white p-2"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                width: "fit-content",
              }}
            >
              {renderGrid()}
            </div>

            {/* 游戏状态显示 */}
            {gameState === "idle" && (
              <div className="text-center">
                <p className="text-gray-600 mb-2">Press Start Game button to begin</p>
                <p className="text-sm text-gray-500">Use arrow keys or WASD to control, spacebar to pause</p>
              </div>
            )}

            {gameState === "paused" && (
              <div className="text-center">
                <p className="text-lg font-semibold text-yellow-600">Game Paused</p>
                <p className="text-sm text-gray-500">Press spacebar or continue button to resume</p>
              </div>
            )}

            {gameState === "gameOver" && (
              <div className="text-center">
                <p className="text-lg font-semibold text-red-600">Game Over!</p>
                <p className="text-gray-600">Final Score: {score}</p>
                {score === highScore && score > 0 && (
                  <p className="text-sm text-green-600 font-semibold">🎉 New Record!</p>
                )}
              </div>
            )}

            {/* 控制按钮 */}
            <div className="flex gap-2">
              {gameState === "idle" && (
                <Button onClick={startGame} className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Start Game
                </Button>
              )}

              {(gameState === "playing" || gameState === "paused") && (
                <Button onClick={pauseGame} variant="outline" className="flex items-center gap-2">
                  <Pause className="w-4 h-4" />
                  {gameState === "playing" ? "Pause" : "Resume"}
                </Button>
              )}

              {gameState !== "idle" && (
                <Button onClick={resetGame} variant="outline" className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Restart
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
