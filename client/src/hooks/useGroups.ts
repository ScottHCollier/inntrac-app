import { useState, useEffect } from 'react';
import agent from '../api/agent';
import { Group } from '../models';

interface UseGroupsResult {
  groups: Group[];
  groupsLoading: boolean;
  groupsError: Error | null;
}

const useGroups = (): UseGroupsResult => {
  const [groups, setUsers] = useState<Group[]>([]);
  const [groupsLoading, setLoading] = useState<boolean>(true);
  const [groupsError, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      try {
        const response = await agent.Groups.getGroups();
        setUsers(response);
      } catch (err) {
        setError(err as Error);
      }
      setLoading(false);
    };

    fetchGroups();
  }, []);

  return { groups, groupsLoading, groupsError };
};

export default useGroups;