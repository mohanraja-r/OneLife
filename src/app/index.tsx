import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { Colors } from '../constants/theme';
import { supabase } from '../services/supabase';

type RouteDecision = 'loading' | 'onboarding' | 'home';

export default function Index() {
  const [decision, setDecision] = useState<RouteDecision>('loading');

  useEffect(() => {
    checkRoute();
  }, []);

  const checkRoute = async () => {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      // No account yet — always start at the beginning of the 16-screen
      // onboarding flow (account creation now happens at the END, screen 16).
      setDecision('onboarding');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, onboarding_completed_at')
      .eq('id', sessionData.session.user.id)
      .maybeSingle();

    if (!profile || !profile.onboarding_completed_at) {
      setDecision('onboarding');
    } else {
      setDecision('home');
    }
  };

  if (decision === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (decision === 'onboarding') return <Redirect href="/onboarding/welcome" />;
  return <Redirect href="/(tabs)/home" />;
}
