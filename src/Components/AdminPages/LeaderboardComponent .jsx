import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from 'prop-types';
import { TrendingUp } from "lucide-react";
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

// Moved constants outside component to prevent recreation
const AVATAR_STYLES = [
  'adventurer', 'adventurer-neutral', 'avataaars', 'big-ears',
  'big-ears-neutral', 'big-smile', 'bottts', 'bottts-neutral',
  'croodles', 'croodles-neutral', 'fun-emoji', 'icons',
  'lorelei', 'lorelei-neutral', 'micah', 'miniavs',
  'notionists', 'notionists-neutral', 'open-peeps', 'personas',
  'pixel-art', 'pixel-art-neutral', 'shapes', 'thumbs'
];

const BACKGROUND_COLORS = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'];

const ANIMATION_DURATION = 1000;

// Separated utility functions
const getConsistentRandomNumber = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const getRandomAvatarConfig = (seed) => {
  const randomNum = getConsistentRandomNumber(seed);
  return {
    style: AVATAR_STYLES[randomNum % AVATAR_STYLES.length],
    backgroundColor: BACKGROUND_COLORS[(randomNum >> 4) % BACKGROUND_COLORS.length]
  };
};

const formatName = (name) => name.split(":")[1]?.trim() || name;

const getInitials = (name) => 
  name.split(" ")
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// Separated reusable components
const AnimatedCounter = ({ finalValue }) => {
  const [count, setCount] = useState(finalValue);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      
      const progress = Math.min((timestamp - startTime) / ANIMATION_DURATION, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      setCount(Math.round(easeProgress * finalValue));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [finalValue]);

  return count;
};

AnimatedCounter.propTypes = {
  finalValue: PropTypes.number.isRequired
};

const UserAvatar = React.memo(({ name, avatarUrl, initials, className = "" }) => {
  const [imgError, setImgError] = useState(false);
  
  return (
    <Avatar className={className}>
      {!imgError && (
        <AvatarImage 
          src={avatarUrl} 
          alt={name}
          onError={() => setImgError(true)}
        />
      )}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
});

UserAvatar.propTypes = {
  name: PropTypes.string.isRequired,
  avatarUrl: PropTypes.string.isRequired,
  initials: PropTypes.string.isRequired,
  className: PropTypes.string
};



const CustomTooltip = React.memo(({ 
  active = false, 
  payload = [] 
}) => {
  if (!active || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white shadow-lg rounded-lg p-4 border">
      <div className="flex items-center gap-2">
        <UserAvatar 
          name={data.name}
          avatarUrl={data.avatarUrl}
          initials={data.initials}
          className="h-10 w-10"
        />
        {data.rank === 1 && <TrendingUp className="text-yellow-500 h-6 w-6" />}
        <span className="font-bold text-gray-800">{data.name}</span>
      </div>
      <div className="text-sm text-gray-600">
        Score: <span className="font-semibold">
          <AnimatedCounter finalValue={data.score} />
        </span>
      </div>
    </div>
  );
});


CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(PropTypes.shape({
    payload: PropTypes.shape({
      name: PropTypes.string.isRequired,
      avatarUrl: PropTypes.string.isRequired,
      initials: PropTypes.string.isRequired,
      rank: PropTypes.number.isRequired,
      score: PropTypes.number.isRequired
    }).isRequired
  }))
};

const LeaderboardComponent = () => {
  const [topUsers, setTopUsers] = useState([]);
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const sessionCode = localStorage.getItem("code");

  const handleLeaderboardUpdate = useCallback((message) => {
    const leaderboardData = JSON.parse(message.body);
    setTopUsers(leaderboardData);
  }, []);

  useEffect(() => {
    const socket = new SockJS(`${baseUrl}/quiz-websocket`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        client.subscribe(
          `/topic/leaderboard/${sessionCode}`,
          handleLeaderboardUpdate
        );
        client.publish({
          destination: `/app/leaderboard/${sessionCode}`,
          body: JSON.stringify({}),
        });
      },
      onStompError: (frame) => {
        console.error("Broker reported error:", frame.headers["message"]);
      },
    });

    client.activate();
    return () => client.deactivate();
  }, [baseUrl, sessionCode, handleLeaderboardUpdate]);

  const chartData = useMemo(() => {
    // Create a new sorted array instead of mutating the original
    const sortedUsers = [...topUsers].sort((a, b) => b.score - a.score);
    
    return sortedUsers.map((user, index) => {
      const name = formatName(user.name);
      const { style, backgroundColor } = getRandomAvatarConfig(name);
      return {
        name,
        score: user.score,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
        rank: index + 1,
        initials: getInitials(name),
        avatarUrl: `https://api.dicebear.com/7.x/${style}/svg?seed=${getConsistentRandomNumber(name)}&size=80&backgroundColor=${backgroundColor}`
      };
    });
  }, [topUsers]
  );

  const renderBarLabel = useCallback(({ x, y, width, height, value, index }) => {
    const data = chartData[index] || {};
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
              name={data.name}
              avatarUrl={data.avatarUrl}
              initials={data.initials}
              className="h-8 w-8"
            />
            <span className="text-2xl font-bold">{data.name}</span>
          </div>
        </foreignObject>
        <text
          x={x + width - 8}
          y={y + height/2}
          fill="white"
          textAnchor="end"
          dominantBaseline="middle"
          className="text-2xl font-black"
        >
          <AnimatedCounter finalValue={data.score} />
        </text>
      </g>
    );
  }, [chartData]);

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
            margin={{ left: 50, top: 10, bottom: 10, right: 120 }}
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
              label={renderBarLabel}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default React.memo(LeaderboardComponent);