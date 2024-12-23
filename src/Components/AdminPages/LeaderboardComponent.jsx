import React, { useState, useEffect } from "react";
import { TrendingUp, Crown } from "lucide-react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const LeaderboardComponent = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [topUsers, setTopUsers] = useState([]);
  const sessionCode = localStorage.getItem("code");
  const userName = localStorage.getItem("username");

  useEffect(() => {
    const socket = new SockJS(`${baseUrl}/quiz-websocket`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log("WebSocket connected");
        client.subscribe(`/topic/leaderboard/${sessionCode}`, (message) => {
          try {
            const leaderboardData = JSON.parse(message.body);
            setTopUsers(leaderboardData);
          } catch (error) {
            console.error("Error parsing leaderboard data:", error);
          }
        });

        client.publish({
          destination: `/app/leaderboard/${sessionCode}`,
          body: JSON.stringify({}),
        });
      },
      onStompError: (frame) => {
        console.error("Broker reported error: " + frame.headers["message"]);
        console.error("Additional details: " + frame.body);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [sessionCode, baseUrl]);

  const chartData = topUsers
    .slice(0, 10) // Limit to top 10 to prevent performance issues
    .sort((a, b) => b.score - a.score)
    .map((user, index) => ({
      name: user.name,
      score: user.score,
      fill: `hsl(var(--chart-${(index % 5) + 1}))`,
      rank: index + 1,
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.[0]?.payload) {
      const data = payload[0].payload;
      return (
        <div className="bg-white shadow-lg rounded-lg p-4 border">
          <div className="flex items-center gap-2">
            {data.rank === 1 && <Crown className="text-yellow-500 h-4 w-4" />}
            <span className="font-bold text-gray-800">{data.name}</span>
          </div>
          <div className="text-sm text-gray-600">
            Score: <span className="font-semibold">{data.score}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate fixed height based on number of entries
  const chartHeight = Math.max(300, chartData.length * 50);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Top players <TrendingUp className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ left: 0, right: 100, top: 10, bottom: 10 }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              width={0}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar
              dataKey="score"
              radius={[0, 5, 5, 0]}
              label={{
                position: 'right',
                content: ({ x, y, width, value, index }) => (
                  <text
                    x={x + width + 5}
                    y={y}
                    fill="currentColor"
                    textAnchor="start"
                    dominantBaseline="middle"
                    className="text-xs font-medium"
                  >
                    {chartData[index]?.name || ""}
                  </text>
                ),
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default LeaderboardComponent;