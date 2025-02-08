import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, CrownIcon } from "lucide-react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const SVGAnimatedCounter = ({ finalValue, x, y, fill, textAnchor, className }) => {
  const [count, setCount] = useState(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  
  useEffect(() => {
    startTimeRef.current = null;
    
    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
        setCount(0);
      }
      
      const runtime = timestamp - startTimeRef.current;
      const duration = 2000;
      const progress = Math.min(runtime / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(easeProgress * finalValue);
      
      setCount(currentValue);
      
      if (runtime < duration) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setCount(finalValue);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [finalValue]);

  return (
    <text
      x={x}
      y={y}
      fill={fill}
      textAnchor={textAnchor}
      dominantBaseline="middle"
      className={className}
    >
      {count === null ? finalValue : count}
    </text>
  );
};

const AnimatedCounter = ({ finalValue }) => {
  const [count, setCount] = useState(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  
  useEffect(() => {
    startTimeRef.current = null;
    
    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
        setCount(0);
      }
      
      const runtime = timestamp - startTimeRef.current;
      const duration = 1000;
      const progress = Math.min(runtime / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(easeProgress * finalValue);
      
      setCount(currentValue);
      
      if (runtime < duration) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setCount(finalValue);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [finalValue]);
  
  return <span>{count === null ? finalValue : count}</span>;
};

const UserAvatar = ({ name, avatarUrl, initials, className = "" }) => {
  const [imgError, setImgError] = useState(false);
  
  return (
    <Avatar className={`${className}`}>
      {!imgError ? (
        <AvatarImage 
          src={avatarUrl} 
          alt={name}
          onError={() => setImgError(true)}
        />
      ) : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
};

const LeaderboardComponent = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [topUsers, setTopUsers] = useState([]);
  const [stompClient, setStompClient] = useState(null);

  const sessionCode = localStorage.getItem("code");
  const userName = sessionStorage.getItem("username");

  // Expanded list of avatar styles and their options
  const avatarStyles = [
    'adventurer',
    'adventurer-neutral',
    'avataaars',
    'big-ears',
    'big-ears-neutral',
    'big-smile',
    'bottts',
    'bottts-neutral',
    'croodles',
    'croodles-neutral',
    'fun-emoji',
    'icons',
    'lorelei',
    'lorelei-neutral',
    'micah',
    'miniavs',
    'notionists',
    'notionists-neutral',
    'open-peeps',
    'personas',
    'pixel-art',
    'pixel-art-neutral',
    'shapes',
    'thumbs'
  ];

  const backgroundColors = [
    'b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'
  ];

  // Function to generate a consistent random number for each user
  const getConsistentRandomNumber = (seed) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  // Function to get a random avatar configuration for a user
  const getRandomAvatarConfig = (seed) => {
    const randomNum = getConsistentRandomNumber(seed);
    const styleIndex = randomNum % avatarStyles.length;
    const style = avatarStyles[styleIndex];
    const bgIndex = (randomNum >> 4) % backgroundColors.length;
    const backgroundColor = backgroundColors[bgIndex];
    
    return { style, backgroundColor };
  };

  // Function to generate avatar URL
  const getAvatarUrl = (name) => {
    const { style, backgroundColor } = getRandomAvatarConfig(name);
    const randomSeed = getConsistentRandomNumber(name);
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${randomSeed}&size=80&backgroundColor=${backgroundColor}`;
  };

  useEffect(() => {
    const socket = new SockJS(`${baseUrl}/quiz-websocket`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log("WebSocket connected");

        client.subscribe(`/topic/leaderboard/${sessionCode}`, (message) => {
          const leaderboardData = JSON.parse(message.body);
          console.log(leaderboardData, "leaderboard");
          setTopUsers(leaderboardData);
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
    setStompClient(client);

    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, [sessionCode, userName, baseUrl]);

  const formatName = (name) => {
    return name.split(":")[1]?.trim() || name;
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const chartData = topUsers
    .sort((a, b) => b.score - a.score)
    .map((user, index) => {
      const formattedName = formatName(user.name);
      return {
        name: formattedName,
        score: user.score,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
        rank: index + 1,
        initials: getInitials(formattedName),
        avatarUrl: getAvatarUrl(formattedName)
      };
    });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white shadow-lg rounded-lg p-4 border">
          <div className="flex items-center gap-2">
            <UserAvatar 
              name={data.name}
              avatarUrl={data.avatarUrl}
              initials={data.initials}
              className="h-10 w-10"
            />
            {data.rank === 1 && <CrownIcon className="text-yellow-500 h-6 w-6" />}
            <span className="font-bold text-gray-800">{data.name}</span>
          </div>
          <div className="text-sm text-gray-600">
            Score: <span className="font-semibold">
              <AnimatedCounter finalValue={data.score} />
            </span>
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
        <ResponsiveContainer width="100%" height={chartData.length * 75}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{
              left: 50,
              top: 10,
              bottom: 10,
              right: 120,
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
                const { x, y, width, height, value, index } = props;
                const data = chartData[index] || {};
                const name = data.name || "";
                const score = data.score || 0;

                return (
                  <g>
                    <foreignObject
                      x={x + width + 5}
                      y={y + height/2 - 16}
                      width="200"
                      height="32"
                    >
                      <div className="flex items-center gap-2">
                        <UserAvatar 
                          name={name}
                          avatarUrl={data.avatarUrl}
                          initials={data.initials}
                          className="h-8 w-8"
                        />
                        <span className="text-2xl font-bold">{name}</span>
                      </div>
                    </foreignObject>
                    <SVGAnimatedCounter
                      finalValue={score}
                      x={x + width - 8}
                      y={y + height/2}
                      fill="white"
                      textAnchor="end"
                      className="text-2xl font-black"
                    />
                  </g>
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