import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { Colors } from '../constants/theme';
import { supabase } from '../services/supabase';

type RouteDecision = 'loading' | 'onboarding' | 'home';

export default function Index() {
  const [decision, setDecision] = useState<RouteDecision>('loading');

  useEffect(() => {
    void checkRoute();
  }, []);

  /** Decides where to send the user on launch, from session and profile. */
  const checkRoute = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        // No account yet — always start at the beginning of the onboarding
        // flow (account creation happens at the END, on the final screen).
        setDecision('onboarding');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, onboarding_completed_at')
        .eq('id', sessionData.session.user.id)
        .maybeSingle();

      setDecision(profile?.onboarding_completed_at ? 'home' : 'onboarding');
    } catch {
      // A dropped connection used to leave this screen spinning forever,
      // because nothing ever moved it off 'loading'. Onboarding is the safe
      // landing: it reads nothing from the network until the last screen.
      setDecision('onboarding');
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
