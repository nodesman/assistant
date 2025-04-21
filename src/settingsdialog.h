#ifndef SETTINGSDIALOG_H
#define SETTINGSDIALOG_H

#include <QDialog>

// Forward Declarations
class QListWidget;
class QStackedWidget;
class QLineEdit;
class QDialogButtonBox;
class QListWidgetItem;

class SettingsDialog : public QDialog
{
    Q_OBJECT

public:
    explicit SettingsDialog(QWidget *parent = nullptr);
    ~SettingsDialog();

    // Methods to load/save settings can be added later
    // void loadSettings();
    // void saveSettings();

private slots:
    void changePage(QListWidgetItem *current, QListWidgetItem *previous);
    void filterCategories(const QString &text);
    // void applySettings(); // Slot for Apply button if needed

private:
    void setupUi();
    void createCategories(); // Helper to populate list and stack
    QWidget* createGeneralPage(); // Placeholder page creation
    QWidget* createApiKeysPage(); // Placeholder page creation
    QWidget* createAppearancePage(); // Placeholder page creation
    QWidget* createUpdatesPage(); // Placeholder page creation

    QLineEdit *m_searchLineEdit;
    QListWidget *m_categoriesListWidget;
    QStackedWidget *m_pagesStackedWidget;
    QDialogButtonBox *m_buttonBox;
};

#endif // SETTINGSDIALOG_H