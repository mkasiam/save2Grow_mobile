import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

interface GoalCardProps {
  title: string;
  currentAmount: number;
  targetAmount: number;
  category: string;
  icon: string;
  onPress: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  title,
  currentAmount,
  targetAmount,
  category,
  icon,
  onPress,
}) => {
  const progress = (currentAmount / targetAmount) * 100;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.category}>{category}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(progress, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.percentage}>{Math.round(progress)}%</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.amount}>
          Tk {currentAmount.toLocaleString()} / Tk {targetAmount.toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    shadowColor: '#103B2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  icon: {
    fontSize: 30,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#10201A',
  },
  category: {
    fontSize: 11,
    color: '#5F6D66',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressBar: {
    height: 9,
    backgroundColor: '#E5EFEA',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1E8E5A',
  },
  percentage: {
    fontSize: 12,
    color: '#2F5144',
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E8EFEC',
    paddingTop: 12,
  },
  amount: {
    fontSize: 13,
    color: '#325346',
    fontWeight: '500',
  },
});
