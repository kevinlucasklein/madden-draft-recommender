import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Player {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar' })
    firstName!: string;

    @Column({ type: 'varchar' })
    lastName!: string;

    @Column({ type: 'varchar' })
    position!: string;

    @Column({ type: 'int' })
    overall!: number;

    // Computed property example
    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    // Additional fields you might want to consider:
    @Column({ type: 'int', nullable: true })
    jerseyNumber?: number;

    @Column({ type: 'varchar', nullable: true })
    team?: string;

    @Column({ type: 'date', nullable: true })
    dateOfBirth?: Date;

    @Column({ type: 'int', nullable: true })
    heightCm?: number;

    @Column({ type: 'int', nullable: true })
    weightKg?: number;
}