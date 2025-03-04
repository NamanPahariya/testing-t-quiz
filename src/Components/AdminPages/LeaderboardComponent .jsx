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

// Custom hook to detect 4K resolution
const use4KDisplay = () => {
  const [is4K, setIs4K] = useState(false);
  
  useEffect(() => {
    const checkResolution = () => {
      setIs4K(window.innerWidth >= 3800 && window.innerHeight >= 2000);
    };
    
    checkResolution();
    window.addEventListener('resize', checkResolution);
    
    return () => window.removeEventListener('resize', checkResolution);
  }, []);
  
  return is4K;
};

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
  const [count, setCount] = useState(0);

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
  const is4K = use4KDisplay();
  
  return (
    <Avatar className={`${is4K ? 'ring-4 ring-primary/10' : ''} ${className}`}>
      {!imgError && (
        <AvatarImage 
          src={avatarUrl} 
          alt={name}
          onError={() => setImgError(true)}
        />
      )}
      <AvatarFallback className={is4K ? "text-3xl" : ""}>{initials}</AvatarFallback>
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
  const is4K = use4KDisplay();

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className={`bg-white shadow-lg rounded-lg ${is4K ? 'p-8 border-2' : 'p-4 border'}`}>
      <div className="flex items-center gap-2">
        <UserAvatar 
          name={data.name}
          avatarUrl={data.avatarUrl}
          initials={data.initials}
          className={is4K ? "h-16 w-16" : "h-10 w-10"}
        />
        {data.rank === 1 && <TrendingUp className={`text-yellow-500 ${is4K ? 'h-10 w-10' : 'h-6 w-6'}`} />}
        <span className={`font-bold text-gray-800 ${is4K ? 'text-3xl' : ''}`}>{data.name}</span>
      </div>
      <div className={`${is4K ? 'text-2xl mt-4' : 'text-sm'} text-gray-600`}>
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
  const is4K = use4KDisplay();
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
      const avatarSize = is4K ? 180 : 80;
      return {
        name,
        score: user.score,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
        rank: index + 1,
        initials: getInitials(name),
        avatarUrl: `https://api.dicebear.com/7.x/${style}/svg?seed=${getConsistentRandomNumber(name)}&size=${avatarSize}&backgroundColor=${backgroundColor}`
      };
    });
  }, [topUsers, is4K]);

  const renderBarLabel = useCallback(({ x, y, width, height, value, index }) => {
    const data = chartData[index] || {};
    return (
      <g>
        <foreignObject
          x={x + width + (is4K ? 15 : 5)}
          y={y + height/2 - (is4K ? 28 : 16)}
          width={is4K ? "300" : "200"}
          height={is4K ? "56" : "32"}
        >
          <div className="flex items-center gap-2">
            <UserAvatar 
              name={data.name}
              avatarUrl={data.avatarUrl}
              initials={data.initials}
              className={is4K ? "h-14 w-14" : "h-8 w-8"}
            />
            <span className={`font-bold ${is4K ? 'text-5xl' : 'text-2xl'}`}>{data.name}</span>
          </div>
        </foreignObject>
        <text
          x={x + width - (is4K ? 26 : 8)}
          y={y + height/2}
          fill="white"
          textAnchor="end"
          dominantBaseline="middle"
          className={`${is4K ? 'text-4xl' : 'text-2xl'} font-black`}
        >
          <AnimatedCounter finalValue={data.score} />
        </text>
      </g>
    );
  }, [chartData, is4K]);

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 ${is4K ? 'p-16' : 'p-4'}`}>
      <div className={`mx-auto ${is4K ? 'w-full' : 'max-w-6xl'}`}>
        <Card className={is4K ? "shadow-2xl" : ""}>
          <CardHeader className={is4K ? "p-16" : ""}>
            <CardTitle className={is4K ? "text-7xl mb-6" : ""}>Leaderboard</CardTitle>
            <div className={`flex gap-2 font-medium leading-none ${is4K ? 'text-3xl' : ''}`}>
              Top players <TrendingUp className={is4K ? "h-8 w-8 ml-2" : "h-4 w-4"} />
            </div>
          </CardHeader>
          <CardContent className={is4K ? "p-12 pt-0" : ""}>
            <ResponsiveContainer 
              width={is4K ? "60%" : "80%"} 
              height={is4K ? chartData.length * 110 : chartData.length * 75}
            >
              <BarChart
                layout="vertical"
                data={chartData}
                margin={is4K 
                  ? { left: 40, top: 20, bottom: 20, right: 220 }
                  : { left: 20, top: 10, bottom: 10, right: 120 }
                }
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
                  radius={[0, is4K ? 8 : 5, is4K ? 8 : 5, 0]}
                  label={renderBarLabel}
                  barSize={is4K ? 100 : 30}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default React.memo(LeaderboardComponent);