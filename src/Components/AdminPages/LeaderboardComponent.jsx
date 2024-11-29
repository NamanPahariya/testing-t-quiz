import React, { useState, useEffect } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const LeaderboardComponent = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const [topUsers, setTopUsers] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [stompClient, setStompClient] = useState(null);

  const sessionCode = localStorage.getItem("sessionCode");
  const userName = localStorage.getItem("username");

  useEffect(() => {
    // Create WebSocket connection
    const socket = new SockJS(`${baseUrl}/quiz-websocket`); // Your WebSocket endpoint
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

        // Subscribe to user-specific leaderboard details
        client.subscribe(`/topic/userLeaderboard/${sessionCode}`, (message) => {
          const userDetails = JSON.parse(message.body);
          setUserRank(userDetails);
        });

        // Request initial leaderboard data
        client.publish({
          destination: `/app/leaderboard/${sessionCode}`,
          body: JSON.stringify({}),
        });

        client.publish({
          destination: `/app/userLeaderboard/${sessionCode}`,
          body: userName,
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

  return (
    <div className="leaderboard">
      <h2>Top 10 Players</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {topUsers.map((user, index) => (
            <tr key={user.name}>
              <td>{index + 1}</td>
              <td>{user.name}</td>
              <td>{user.score}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {userRank && (
        <div className="user-rank">
          <h3>Your Ranking</h3>
          <p>Name: {userRank.name}</p>
          <p>Score: {userRank.score}</p>
          <p>Rank: {userRank.rank}</p>
        </div>
      )}
    </div>
  );
};

export default LeaderboardComponent;
