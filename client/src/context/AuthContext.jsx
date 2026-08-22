import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, projectApi } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    const res = await authApi.getMe();
                    if (res.success) {
                        setUser(res.data);
                        await fetchProjects();
                    } else {
                        logout();
                    }
                } catch (err) {
                    console.error('Failed to verify token:', err);
                    logout();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, [token]);

    const fetchProjects = async () => {
        try {
            const res = await projectApi.list();
            if (res.success && res.data.length > 0) {
                setProjects(res.data);
                setCurrentProject(res.data[0]);
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    };

    const login = async (email, password) => {
        const res = await authApi.login({ email, password });
        if (res.success) {
            localStorage.setItem('token', res.data.token);
            setToken(res.data.token);
            setUser(res.data.user);
            await fetchProjects();
            return res.data;
        }
    };

    const register = async (email, password, name, orgName) => {
        const res = await authApi.register({ email, password, name, orgName });
        if (res.success) {
            localStorage.setItem('token', res.data.token);
            setToken(res.data.token);
            setUser(res.data.user);
            await fetchProjects();
            return res.data;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setProjects([]);
        setCurrentProject(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                projects,
                currentProject,
                setCurrentProject,
                login,
                register,
                logout,
                fetchProjects,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
