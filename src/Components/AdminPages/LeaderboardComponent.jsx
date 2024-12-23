import React, { useState, useEffect } from "react";
import { TrendingUp, CrownIcon } from "lucide-react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
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
  const [stompClient, setStompClient] = useState(null);

  const sessionCode = localStorage.getItem("code");
  console.log(sessionCode, "sessionCode");
  const userName = localStorage.getItem("username");

  useEffect(() => {
    // Create WebSocket connection
    const socket = new SockJS(`${baseUrl}/quiz-websocket`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log("WebSocket connected");

        // Subscribe to top 10 leaderboard
        client.subscribe(`/topic/leaderboard/${sessionCode}`, (message) => {
          const leaderboardData = JSON.parse(message.body);
          console.log(leaderboardData, "leaderboard");
          setTopUsers(leaderboardData);
        });

        // Request initial leaderboard data
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

    // Activate the client
    client.activate();
    setStompClient(client);

    // Cleanup function
    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, [sessionCode, userName, baseUrl]);

  // Prepare data for bar chart
  const chartData = topUsers
    .sort((a, b) => b.score - a.score)
    .map((user, index) => ({
      name: user.name,
      score: user.score,
      fill: `hsl(var(--chart-${(index % 5) + 1}))`,
      rank: index + 1,
    }));

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white shadow-lg rounded-lg p-4 border">
          <div className="flex items-center gap-2">
            {data.rank === 1 && <CrownIcon className="text-yellow-500" />}
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <div className="flex gap-2 font-medium leading-none">
          Top players <TrendingUp className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartData.length * 50}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{
              left: 0,
              top: 10,
              bottom: 10,
              right: 100,
            }}
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
              layout="vertical"
              radius={[0, 5, 5, 0]}
              label={(props) => {
                const { x, y, width, value, index } = props;
                const name = chartData[index]?.name || "";

                return (
                  <text
                    x={x + width + 5}
                    y={y}
                    fill="hsl(var(--foreground))"
                    textAnchor="start"
                    dominantBaseline="middle"
                    className="text-xs font-medium"
                  >
                    {name}
                  </text>
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default LeaderboardComponent;