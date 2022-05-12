import axios from "axios";
import { useEffect, useState } from "react";
import useAuthentication from "./UseAuthentication";

export interface Leaderboard {
  member_count: number,
  name: string
}

export interface LeaderboardData {
  name: string,
  invite: string,
  creation_time: string,
  members: {
    username: string,
    admin: boolean,
    time_coded: number
  }[]
}

export type CombinedLeaderboard = Leaderboard & LeaderboardData;

export const useLeaderboards = () => {
  const { token } = useAuthentication();
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<{ [leaderboardName: string]: LeaderboardData }>({});

  useEffect(() => {
    axios.get<Leaderboard[]>("/users/@me/leaderboards", {
      headers: { Authorization: `Bearer ${token ?? ""}` }
    }).then(res => {
      setLeaderboards(res.data);
    }).catch(e => console.error(e));
  }, []);

  useEffect(() => {
    const promises = leaderboards.map(leaderboard =>
      axios.get<LeaderboardData>(`/leaderboards/${leaderboard.name}`,
        { headers: { Authorization: `Bearer ${token ?? ""}` } })
    );

    Promise.all(promises).then(values => {
      const data = values.reduce<Record<string, LeaderboardData>>((acc, cur) => {
        acc[cur.data.name] = cur.data;
        return acc;
      }, {});
      setLeaderboardData(data);
    }).catch(e => console.error(e));
  }, [leaderboards]);

  const joinLeaderboard = async (leaderboardCode: string) => {
    // TODO: Wait for https://github.com/Testaustime/testaustime-backend/pull/21 to get merged
    // After that member_count can be made non-nullable
    const res = await axios.post<{ name: string, member_count?: number }>("/leaderboards/join", {
      invite: leaderboardCode
    }, {
      headers: { Authorization: `Bearer ${token ?? ""}` }
    });

    setLeaderboards([...leaderboards, { name: res.data.name, member_count: res.data.member_count ?? 0 }]);
  };

  const leaveLeaderboard = async (leaderboardName: string) => {
    await axios.post(`/leaderboards/${leaderboardName}/leave`, {}, {
      headers: { Authorization: `Bearer ${token ?? ""}` }
    });
    setLeaderboards(leaderboards.filter(leaderboard => leaderboard.name !== leaderboardName));
  };

  const createLeaderboard = async (leaderboardName: string) => {
    await axios.post<{ invite_code: string }>("/leaderboards/create", {
      name: leaderboardName
    }, {
      headers: { Authorization: `Bearer ${token ?? ""}` }
    });
    setLeaderboards([...leaderboards, { name: leaderboardName, member_count: 0 }]);
  };

  return {
    leaderboards: leaderboards.map(l => ({
      ...l,
      ...leaderboardData[l.name]
    })),
    joinLeaderboard,
    leaveLeaderboard,
    createLeaderboard
  };
};