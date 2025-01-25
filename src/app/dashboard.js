import { withPageAuthRequired } from '@auth0/nextjs-auth0';

function Dashboard({ user }) {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.name}</p>
    </div>
  );
}

export default withPageAuthRequired(Dashboard);
