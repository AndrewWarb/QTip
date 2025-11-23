using Microsoft.EntityFrameworkCore;
using QTip.Models;

namespace QTip.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Submission> Submissions { get; set; }
    public DbSet<Classification> Classifications { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Classification>()
            .HasOne(c => c.Submission)
            .WithMany(s => s.Classifications)
            .HasForeignKey(c => c.SubmissionId);
    }
}